const { prisma } = require('../prisma/client');
const PDFDocument = require('pdfkit');

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
    const { clienteNombre, clienteDocumento, clienteTelefono, clienteDireccion, iva, items, notas } = req.body;

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
    const { clienteNombre, clienteDocumento, clienteTelefono, clienteDireccion, iva, items, notas } = req.body;

    const existente = await prisma.factura.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const data = {};
    if (clienteNombre !== undefined) data.clienteNombre = clienteNombre;
    if (clienteDocumento !== undefined) data.clienteDocumento = clienteDocumento;
    if (clienteTelefono !== undefined) data.clienteTelefono = clienteTelefono;
    if (clienteDireccion !== undefined) data.clienteDireccion = clienteDireccion;
    if (notas !== undefined) data.notas = notas;
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

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${factura.numero}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('FACTURA', { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`N° ${String(factura.numero).padStart(4, '0')}`, { align: 'right' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#999')
      .text(`Fecha: ${new Date(factura.createdAt).toLocaleDateString('es-CO')}`, { align: 'right' })
      .text(`Vence: ${new Date(new Date(factura.createdAt).getTime() + 30*86400000).toLocaleDateString('es-CO')}`, { align: 'right' });

    doc.moveDown(1.5);

    // Empresa info (left)
    const empresaNombre = process.env.EMPRESA_NOMBRE || 'GestiónNovedades';
    const empresaNit = process.env.EMPRESA_NIT || '900.123.456-7';
    const empresaDireccion = process.env.EMPRESA_DIRECCION || 'Calle 123 #45-67, Bogotá';
    const empresaTelefono = process.env.EMPRESA_TELEFONO || 'Tel: (601) 123-4567';
    const empresaEmail = process.env.EMPRESA_EMAIL || 'info@novedades.com';

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text(empresaNombre);
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`NIT: ${empresaNit}`)
      .text(empresaDireccion)
      .text(empresaTelefono)
      .text(empresaEmail);

    doc.moveDown();

    // Client info (right-aligned box)
    const clientX = 300;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text('Cliente:', clientX, doc.y - 70);
    doc.fontSize(9).font('Helvetica').fillColor('#333')
      .text(factura.clienteNombre, clientX)
      .text(factura.clienteDocumento ? `NIT/CC: ${factura.clienteDocumento}` : '', clientX)
      .text(factura.clienteTelefono ? `Tel: ${factura.clienteTelefono}` : '', clientX)
      .text(factura.clienteDireccion || '', clientX);

    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    const col1 = 50, col2 = 270, col3 = 360, col4 = 440, col5 = 500;
    const tableFullWidth = 510;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.rect(50, tableTop - 3, tableFullWidth, 18).fill('#6366f1');
    doc.fillColor('#fff')
      .text('Descripción', col1 + 5, tableTop + 2)
      .text('Cant', col2, tableTop + 2, { width: 60, align: 'center' })
      .text('Precio', col3, tableTop + 2, { width: 60, align: 'right' })
      .text('Total', col5, tableTop + 2, { width: 60, align: 'right' });

    // Table rows
    let y = tableTop + 20;
    doc.font('Helvetica').fontSize(9).fillColor('#333');

    factura.items.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.rect(50, y - 2, tableFullWidth, 16).fill('#f8f9fc');
      }
      doc.fillColor('#333')
        .text(item.descripcion, col1 + 5, y, { width: 210 })
        .text(String(item.cantidad), col2, y, { width: 60, align: 'center' })
        .text(`$${item.precioUnitario.toLocaleString('es-CO')}`, col3, y, { width: 70, align: 'right' })
        .text(`$${item.total.toLocaleString('es-CO')}`, col5, y, { width: 60, align: 'right' });
      y += 16;
    });

    // Separator line
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(50 + tableFullWidth, doc.y).stroke('#ccc');
    doc.moveDown(0.3);

    // Totals
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
    const totalY = doc.y;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333')
      .text('TOTAL:', totX, totalY, { width: 100, align: 'right' })
      .text(`$${factura.total.toLocaleString('es-CO')}`, col5, totalY, { width: 60, align: 'right' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('#999')
      .text(`Estado: ${factura.estado.toUpperCase()}`, 50, doc.y)
      .text(`Generado por: ${factura.createdBy.nombre}`, 50, doc.y + 12);

    if (factura.notas) {
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#666').text(`Notas: ${factura.notas}`, 50);
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
