const { prisma } = require('../prisma/client');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const getAll = async (req, res) => {
  try {
    const { estado, search } = req.query;

    const where = {};
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { clienteNombre: { contains: search } },
        { clienteDocumento: { contains: search } },
        { numero: isNaN(search) ? undefined : parseInt(search) }
      ].filter(Boolean);
    }

    const facturas = await prisma.factura.findMany({
      where,
      include: { createdBy: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const stats = {
      total: await prisma.factura.count(),
      pendiente: await prisma.factura.count({ where: { estado: 'pendiente' } }),
      pagada: await prisma.factura.count({ where: { estado: 'pagada' } }),
      cancelada: await prisma.factura.count({ where: { estado: 'cancelada' } }),
      totalMonto: (await prisma.factura.aggregate({ _sum: { total: true }, where: { estado: 'pendiente' } }))._sum.total || 0
    };

    res.json({ facturas, stats });
  } catch (error) {
    console.error('Get facturas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        items: true
      }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json(factura);
  } catch (error) {
    console.error('Get factura error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { clienteNombre, clienteDocumento, clienteTelefono, clienteDireccion, iva, items, notas, metodoPago } = req.body;

    if (!clienteNombre || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nombre del cliente y al menos un item son requeridos' });
    }

    const subtotal = items.reduce((s, i) => s + ((parseFloat(i.precioUnitario) || 0) * (parseInt(i.cantidad) || 1)), 0);
    const ivaMonto = parseFloat(iva) || 0;
    const total = subtotal + ivaMonto;

    const ultima = await prisma.factura.findFirst({ orderBy: { numero: 'desc' }, select: { numero: true } });
    const numero = (ultima?.numero || 0) + 1;

    const factura = await prisma.factura.create({
      data: {
        numero,
        clienteNombre,
        clienteDocumento: clienteDocumento || null,
        clienteTelefono: clienteTelefono || null,
        clienteDireccion: clienteDireccion || null,
        subtotal,
        iva: ivaMonto,
        total,
        notas: notas || null,
        metodoPago: metodoPago || 'contraentrega',
        createdById: req.usuario.id,
        items: {
          create: items.map(i => ({
            descripcion: i.descripcion || 'Sin descripción',
            cantidad: parseInt(i.cantidad) || 1,
            precioUnitario: parseFloat(i.precioUnitario) || 0,
            total: (parseFloat(i.precioUnitario) || 0) * (parseInt(i.cantidad) || 1)
          }))
        }
      },
      include: { items: true, createdBy: { select: { id: true, nombre: true } } }
    });

    res.status(201).json(factura);
  } catch (error) {
    console.error('Create factura error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { clienteNombre, clienteDocumento, clienteTelefono, clienteDireccion, iva, items, notas, metodoPago } = req.body;

    const existente = await prisma.factura.findUnique({ where: { id } });

    const data = {};
    if (clienteNombre !== undefined) data.clienteNombre = clienteNombre;
    if (clienteDocumento !== undefined) data.clienteDocumento = clienteDocumento;
    if (clienteTelefono !== undefined) data.clienteTelefono = clienteTelefono;
    if (clienteDireccion !== undefined) data.clienteDireccion = clienteDireccion;
    if (notas !== undefined) data.notas = notas;
    if (metodoPago !== undefined) data.metodoPago = metodoPago;
    if (iva !== undefined) data.iva = parseFloat(iva) || 0;

    if (items && Array.isArray(items)) {
      const subtotal = items.reduce((s, i) => s + ((parseFloat(i.precioUnitario) || 0) * (parseInt(i.cantidad) || 1)), 0);
      const ivaMonto = data.iva !== undefined ? data.iva : existente.iva;
      data.subtotal = subtotal;
      data.total = subtotal + ivaMonto;

      await prisma.facturaItem.deleteMany({ where: { facturaId: id } });

      await prisma.facturaItem.createMany({
        data: items.map(i => ({
          facturaId: id,
          descripcion: i.descripcion || 'Sin descripción',
          cantidad: parseInt(i.cantidad) || 1,
          precioUnitario: parseFloat(i.precioUnitario) || 0,
          total: (parseFloat(i.precioUnitario) || 0) * (parseInt(i.cantidad) || 1)
        }))
      });
    }

    const factura = await prisma.factura.update({
      where: { id },
      data,
      include: { items: true, createdBy: { select: { id: true, nombre: true } } }
    });

    res.json(factura);
  } catch (error) {
    console.error('Update factura error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'pagada', 'cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const factura = await prisma.factura.update({
      where: { id },
      data: { estado },
      include: { items: true, createdBy: { select: { id: true, nombre: true } } }
    });

    res.json(factura);
  } catch (error) {
    console.error('Cambiar estado factura error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.facturaItem.deleteMany({ where: { facturaId: id } });
    await prisma.factura.delete({ where: { id } });

    res.json({ message: 'Factura eliminada' });
  } catch (error) {
    console.error('Delete factura error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const factura = await prisma.factura.findUnique({
      where: { id },
      include: { items: true, createdBy: { select: { nombre: true } } }
    });

    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const config = await prisma.configuracion.findFirst();
    const empresaNombre = config?.empresa_nombre || 'GestiónNovedades';
    const empresaNit = config?.empresa_nit || '900.123.456-7';
    const empresaDireccion = config?.empresa_direccion || 'Calle 123 #45-67, Bogotá';
    const empresaTelefono = config?.empresa_telefono || 'Tel: (601) 123-4567';
    const empresaEmail = config?.empresa_email || 'info@novedades.com';
    const empresaLogo = config?.empresa_logo || null;
    const prefijo = config?.factura_prefijo || 'FAC';
    const resolucion = config?.factura_resolucion || null;
    const rangoDesde = config?.factura_rango_desde || null;
    const rangoHasta = config?.factura_rango_hasta || null;
    const vigencia = config?.factura_vigencia || null;
    const terminos = config?.factura_terminos || null;
    const pieLegal = config?.factura_pie_legal || 'Documento generado por sistema. No requiere firma para su validez.';
    const metodoLabel = {
      contraentrega: 'Contraentrega', transferencia: 'Transferencia',
      efectivo: 'Efectivo', otro: 'Otro'
    }[factura.metodoPago] || 'Contraentrega';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.numero}.pdf`);
    doc.pipe(res);

    // Header section - Logo + title
    let headerH = 0;
    if (empresaLogo) {
      try {
        const resp = await fetch(empresaLogo);
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          doc.image(buffer, 50, 50, { width: 70 });
        }
      } catch { /* logo not loaded */ }
    }

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1a1d2e')
      .text(`${prefijo}-${String(factura.numero).padStart(4, '0')}`, 400, 50, { align: 'right', width: 145 });
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`Fecha: ${new Date(factura.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`, 400, doc.y + 6, { align: 'right', width: 145 })
      .text(`Vence: ${new Date(new Date(factura.createdAt).getTime() + 30 * 86400000).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`, 400, doc.y + 2, { align: 'right', width: 145 });

    doc.moveDown(2.5);

    // Company info
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text(empresaNombre);
    doc.fontSize(8).font('Helvetica').fillColor('#666')
      .text(`NIT: ${empresaNit}`)
      .text(empresaDireccion)
      .text(empresaTelefono)
      .text(empresaEmail);

    doc.moveDown(0.5);

    // DIAN Resolution
    if (resolucion) {
      doc.fontSize(7).fillColor('#999')
        .text(`Res. DIAN N° ${resolucion}${rangoDesde && rangoHasta ? ` · Del ${rangoDesde} al ${rangoHasta}` : ''}${vigencia ? ` · Vigente hasta ${vigencia}` : ''}`);
    }

    doc.moveDown();

    // Client info
    const clientX = 320;
    const clientBaseY = 92;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text('DATOS DEL CLIENTE', clientX, clientBaseY);
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text(factura.clienteNombre, clientX)
      .text(factura.clienteDocumento ? `NIT/CC: ${factura.clienteDocumento}` : '', clientX)
      .text(factura.clienteTelefono ? `Tel: ${factura.clienteTelefono}` : '', clientX)
      .text(factura.clienteDireccion || '', clientX)
      .text(`Método de pago: ${metodoLabel}`, clientX);

    doc.moveDown(2);

    // Vencimiento highlight
    const vencimiento = new Date(new Date(factura.createdAt).getTime() + 30 * 86400000);
    const venY = doc.y;
    doc.rect(50, venY, 220, 22).fill('#fef3c7');
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#92400e')
      .text(`⚠ VENCE: ${vencimiento.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`, 60, venY + 5);

    doc.moveDown(1);

    // Table
    const tableTop = doc.y;
    const col1 = 50, col2 = 270, col3 = 360, col4 = 440, col5 = 500;
    const tableFullWidth = 515;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.rect(50, tableTop - 3, tableFullWidth, 18).fill('#6366f1');
    doc.fillColor('#fff')
      .text('Descripción', col1 + 5, tableTop + 2)
      .text('Cant', col2, tableTop + 2, { width: 60, align: 'center' })
      .text('Precio', col3, tableTop + 2, { width: 60, align: 'right' })
      .text('Total', col5, tableTop + 2, { width: 60, align: 'right' });

    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9).fillColor('#333');
    factura.items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, y - 2, tableFullWidth, 16).fill('#f8f9fc');
      doc.fillColor('#333')
        .text(item.descripcion, col1 + 5, y, { width: 210 })
        .text(String(item.cantidad), col2, y, { width: 60, align: 'center' })
        .text(`$${item.precioUnitario.toLocaleString('es-CO')}`, col3, y, { width: 70, align: 'right' })
        .text(`$${item.total.toLocaleString('es-CO')}`, col5, y, { width: 60, align: 'right' });
      y += 16;
    });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(50 + tableFullWidth, doc.y).stroke('#ccc');
    doc.moveDown(0.3);

    const totX = 400;
    const subtotalY = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text('Subtotal:', totX, subtotalY, { width: 100, align: 'right' })
      .text(`$${factura.subtotal.toLocaleString('es-CO')}`, col5, subtotalY, { width: 60, align: 'right' });
    doc.moveDown(0.3);
    const ivaY = doc.y;
    doc.fillColor('#666')
      .text('IVA:', totX, ivaY, { width: 100, align: 'right' })
      .text(`$${factura.iva.toLocaleString('es-CO')}`, col5, ivaY, { width: 60, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(col4, doc.y).lineTo(50 + tableFullWidth, doc.y).stroke('#6366f1');
    doc.moveDown(0.2);
    const totalY = doc.y;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#6366f1')
      .text('TOTAL:', totX, totalY, { width: 100, align: 'right' })
      .text(`$${factura.total.toLocaleString('es-CO')}`, col5, totalY, { width: 60, align: 'right' });

    // QR Code
    doc.moveDown(1.5);
    const qrY = doc.y;
    const frontendUrl = process.env.FRONTEND_URL || '';
    const qrData = frontendUrl ? `${frontendUrl}/facturas/${factura.id}` : `Factura #${factura.numero}`;
    const qrBuffer = await QRCode.toBuffer(qrData, { width: 120, margin: 1, color: { dark: '#1a1d2e', light: '#ffffff' } });
    doc.image(qrBuffer, 440, qrY, { width: 75 });
    doc.fontSize(7).font('Helvetica').fillColor('#999')
      .text('Escanear para ver', 440, qrY + 78, { width: 75, align: 'center' });

    // Banking info (only if transferencia)
    if (factura.metodoPago === 'transferencia' && (config?.empresa_banco || config?.empresa_numero_cuenta)) {
      doc.moveDown(0.5);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text('DATOS PARA TRANSFERENCIA', 50);
      doc.fontSize(8).font('Helvetica').fillColor('#666')
        .text(config?.empresa_banco ? `Banco: ${config.empresa_banco}${config?.empresa_tipo_cuenta ? ` · ${config.empresa_tipo_cuenta}` : ''}` : '', 50)
        .text(config?.empresa_numero_cuenta ? `N° ${config.empresa_numero_cuenta}` : '', 50)
        .text(config?.empresa_titular_cuenta ? `Titular: ${config.empresa_titular_cuenta}` : '', 50);
    }

    // Terms
    if (terminos) {
      doc.moveDown(0.8);
      doc.fontSize(7).font('Helvetica').fillColor('#999')
        .text(terminos, 50, doc.y, { width: 350 });
    }

    // Footer
    doc.moveDown(1.5);
    doc.fontSize(8).fillColor('#999')
      .text(`Estado: ${factura.estado.toUpperCase()}`, 50, doc.y)
      .text(pieLegal, 50, doc.y + 12);

    // PAID stamp
    if (factura.estado === 'pagada') {
      const stampY = doc.y + 30;
      doc.save();
      doc.rotate(-20, { origin: [280, stampY] });
      doc.fontSize(48).font('Helvetica-Bold').fillColor('#22c55e').opacity(0.25)
        .text('PAGADO', 160, stampY - 20);
      doc.restore();
    }

    doc.end();
  } catch (error) {
    console.error('PDF factura error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar PDF' });
    }
  }
};

module.exports = { getAll, getById, create, update, cambiarEstado, remove, getPdf };
