const { prisma } = require('../prisma/client');
const { paginate } = require('../utils/paginate');
const { registrarCambio } = require('./historial.controller');
const { getNextOperador } = require('../utils/autoAssign');
const wpService = require('../services/whatsapp.service');
const wsService = require('../services/websocket.service');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, estados, estado, transportadora, search, fechaDesde, fechaHasta, asignado_a_mi, favorito, guiaDesde, guiaHasta, etiquetaId, asignadoId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    where.estado = { notIn: ['va_a_recoger', 'entregado'] };

    if (estados) {
      try {
        const estadosArray = JSON.parse(estados);
        if (Array.isArray(estadosArray) && estadosArray.length > 0) {
          where.estado = { in: estadosArray };
        }
      } catch {
        return res.status(400).json({ error: 'Parámetro estados inválido' });
      }
    } else if (estado) {
      where.estado = estado;
    }

    if (transportadora) where.transportadora = { contains: transportadora };
    if (search) {
      const words = search.split(/\s+/).filter(Boolean);
      where.AND = words.map(word => ({
        OR: [
          { nombre: { contains: word, mode: 'insensitive' } },
          { apellido: { contains: word, mode: 'insensitive' } },
          { guia: { contains: word, mode: 'insensitive' } },
          { producto: { contains: word, mode: 'insensitive' } },
          { celular: { contains: word, mode: 'insensitive' } }
        ]
      }));
    }
    if (fechaDesde || fechaHasta) {
      where.createdAt = {};
      if (fechaDesde) where.createdAt.gte = new Date(fechaDesde);
      if (fechaHasta) where.createdAt.lte = new Date(fechaHasta);
    }
    if (guiaDesde || guiaHasta) {
      where.guia = {};
      if (guiaDesde) where.guia.gte = guiaDesde;
      if (guiaHasta) where.guia.lte = guiaHasta;
    }

    if (req.usuario.rol !== 'admin') {
      const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id }, select: { verSoloAsignados: true } });
      if (req.usuario.rol === 'operador_asignado' || asignado_a_mi === 'true' || usuario?.verSoloAsignados) {
        where.asignadoId = req.usuario.id;
      }
    }

    if (favorito === 'true') {
      where.favorito = true;
    }

    if (asignadoId) {
      where.asignadoId = asignadoId;
    }

    if (etiquetaId) {
      const registrosConEtiqueta = await prisma.registroEtiqueta.findMany({
        where: { etiquetaId, tabla: 'pedidos_oficina' },
        select: { registroId: true }
      });
      where.id = { in: registrosConEtiqueta.map(r => r.registroId) };
    }

    const [pedidos, total, transferencias] = await Promise.all([
      prisma.pedidoOficina.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          createdBy: { select: { id: true, nombre: true } },
          asignado: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pedidoOficina.count({ where }),
      prisma.transferencia.findMany({
        where: { tabla: 'pedidos_oficina' },
        include: {
          deUsuario: { select: { id: true, nombre: true } },
          aUsuario: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const pedidosIds = pedidos.map(p => p.id);
    const todasEtiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: { in: pedidosIds }, tabla: 'pedidos_oficina' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    const etiquetasPorId = {};
    todasEtiquetas.forEach(e => {
      if (!etiquetasPorId[e.registroId]) etiquetasPorId[e.registroId] = [];
      etiquetasPorId[e.registroId].push(e.etiqueta);
    });

    pedidos.forEach(p => {
      p._etiquetas = etiquetasPorId[p.id] || [];
    });

    const resultado = paginate(pedidos, total, parseInt(page), parseInt(limit));
    resultado.transferencia = transferencias;
    res.json(resultado);
  } catch (error) {
    console.error('Get oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const pedido = await prisma.pedidoOficina.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (req.usuario.rol === 'operador_asignado' && pedido.asignadoId !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes acceso a este pedido' });
    }

    const chatExpired = await wpService.autoExpireChatWindow('pedidos_oficina', id);
    const respuesta = { ...pedido };
    if (chatExpired) {
      respuesta.chatActivo = false;
    }

    const [historialCambios, intentosContacto, transferencias, etiquetas] = await Promise.all([
      prisma.historialCambio.findMany({
        where: { tabla: 'pedidos_oficina', registroId: id },
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.intentoContacto.findMany({
        where: { tabla: 'pedidos_oficina', registroId: id },
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transferencia.findMany({
        where: { tabla: 'pedidos_oficina', registroId: id },
        include: {
          deUsuario: { select: { id: true, nombre: true } },
          aUsuario: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.registroEtiqueta.findMany({
        where: { tabla: 'pedidos_oficina', registroId: id },
        include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
      })
    ]);

    res.json({
      ...respuesta,
      etiquetas: etiquetas.map(e => e.etiqueta),
      historialCambios,
      intentosContacto,
      transferencias
    });
  } catch (error) {
    console.error('Get oficina by id error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, apellido, celular, celular2, producto, precio, transportadora, guia, imagenGuiaUrl, fechaLlegada, notas, notasInternas, conversacionLink, chatActivo, fechaUltimoMsjCliente } = req.body;

    const fechaLimite = fechaLlegada
      ? new Date(new Date(fechaLlegada).getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);

    let asignadoId = await getNextOperador('oficina');
    if (!asignadoId) {
      const admin = await prisma.usuario.findFirst({ where: { rol: 'admin', activo: true }, select: { id: true } });
      asignadoId = admin?.id || req.usuario.id;
    }

    const pedido = await prisma.pedidoOficina.create({
      data: {
        nombre,
        apellido,
        celular,
        celular2: celular2 || null,
        producto,
        precio: parseFloat(precio) || 0,
        transportadora,
        guia,
        imagenGuiaUrl,
        fechaLimite,
        notas,
        notasInternas,
        conversacionLink: conversacionLink || null,
        chatActivo: chatActivo || false,
        fechaUltimoMsjCliente: fechaUltimoMsjCliente ? new Date(fechaUltimoMsjCliente) : null,
        createdById: req.usuario.id,
        asignadoId
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    wsService.oficinaCreada(pedido, req.usuario);
    res.status(201).json(pedido);
  } catch (error) {
    console.error('Create oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, celular, celular2, producto, precio, transportadora, guia, imagenGuiaUrl, fechaLlegada, notas, notasInternas, conversacionLink } = req.body;

    const actual = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!actual) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const campos = ['nombre', 'apellido', 'celular', 'producto', 'transportadora', 'guia', 'imagenGuiaUrl', 'notas', 'notasInternas'];
    const clienteNombre = `${actual.nombre} ${actual.apellido}`;
    for (const campo of campos) {
      if (req.body[campo] !== undefined && req.body[campo] !== actual[campo]) {
        await registrarCambio(id, 'pedidos_oficina', campo, actual[campo], req.body[campo], req.usuario.id, clienteNombre);
      }
    }
    if (req.body.precio !== undefined && parseFloat(req.body.precio) !== actual.precio) {
      await registrarCambio(id, 'pedidos_oficina', 'precio', actual.precio, req.body.precio, req.usuario.id, clienteNombre);
    }
    if (req.body.conversacionLink !== undefined && req.body.conversacionLink !== (actual.conversacionLink || null)) {
      await registrarCambio(id, 'pedidos_oficina', 'conversacionLink', actual.conversacionLink, req.body.conversacionLink, req.usuario.id, clienteNombre);
    }

    const actualFechaLimiteStr = actual.fechaLimite ? actual.fechaLimite.toISOString().split('T')[0] : null;
    if (fechaLlegada && fechaLlegada !== actualFechaLimiteStr) {
      const nuevaFechaLimite = new Date(new Date(fechaLlegada).getTime() + 7 * 24 * 60 * 60 * 1000);
      await registrarCambio(id, 'pedidos_oficina', 'fecha_limite', actualFechaLimiteStr, nuevaFechaLimite.toISOString(), req.usuario.id, clienteNombre);
    }

    const data = { nombre, apellido, celular, producto, transportadora, guia, imagenGuiaUrl, notas, notasInternas };
    if (req.body.celular2 !== undefined) data.celular2 = req.body.celular2 || null;
    if (req.body.precio !== undefined) data.precio = parseFloat(req.body.precio) || 0;
    if (req.body.conversacionLink !== undefined) data.conversacionLink = req.body.conversacionLink || null;
    if (fechaLlegada) {
      data.fechaLimite = new Date(new Date(fechaLlegada).getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const pedido = await prisma.pedidoOficina.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, nombre: true } }
      }
    });

    res.json(pedido);
  } catch (error) {
    console.error('Update oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const actual = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!actual) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    await registrarCambio(id, 'pedidos_oficina', 'estado', actual.estado, estado, req.usuario.id, `${actual.nombre} ${actual.apellido}`);

    const pedido = await prisma.pedidoOficina.update({
      where: { id },
      data: { estado },
      include: {
        createdBy: { select: { id: true, nombre: true } }
      }
    });

    wsService.oficinaEstadoCambiado(id, actual.estado, estado, req.usuario);
    res.json(pedido);
  } catch (error) {
    console.error('Cambiar estado oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const registrarIntento = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultado, notas } = req.body;

    const pedido = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    await prisma.intentoContacto.create({
      data: {
        tabla: 'pedidos_oficina',
        registroId: id,
        resultado,
        notas,
        usuarioId: req.usuario.id
      }
    });

    const nuevoIntento = await prisma.pedidoOficina.update({
      where: { id },
      data: { intentosLlamada: { increment: 1 } },
      include: {
        createdBy: { select: { id: true, nombre: true } }
      }
    });

    wsService.oficinaActualizada(id, { intentosLlamada: nuevoIntento.intentosLlamada }, req.usuario);
    res.json(nuevoIntento);
  } catch (error) {
    console.error('Registrar intento oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.registroEtiqueta.deleteMany({ where: { registroId: id, tabla: 'pedidos_oficina' } });
    await prisma.intentoContacto.deleteMany({ where: { registroId: id, tabla: 'pedidos_oficina' } });
    await prisma.historialCambio.deleteMany({ where: { registroId: id, tabla: 'pedidos_oficina' } });
    await prisma.transferencia.deleteMany({ where: { registroId: id, tabla: 'pedidos_oficina' } });
    await prisma.pedidoOficina.delete({ where: { id } });

    wsService.oficinaEliminada(id, req.usuario);
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    console.error('Remove oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getVencimientos = async (req, res) => {
  try {
    const hoy = new Date();
    const tresDias = new Date(hoy.getTime() + 3 * 24 * 60 * 60 * 1000);

    const pedidos = await prisma.pedidoOficina.findMany({
      where: {
        estado: { in: ['pendiente_llamar', 'contactado'] },
        fechaLimite: { lte: tresDias }
      },
      include: {
        createdBy: { select: { id: true, nombre: true } }
      },
      orderBy: { fechaLimite: 'asc' }
    });

    res.json(pedidos);
  } catch (error) {
    console.error('Get vencimientos error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const exportarExcel = async (req, res) => {
  try {
    const { exportService } = require('../services/export.service');
    const pedidos = await prisma.pedidoOficina.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const data = pedidos.map(p => ({
      ID: p.id,
      Nombre: `${p.nombre} ${p.apellido}`,
      Celular: p.celular,
      Producto: p.producto,
      Transportadora: p.transportadora,
      Guía: p.guia,
      'Fecha Límite': p.fechaLimite.toISOString().split('T')[0],
      Estado: p.estado,
      'Intentos Llamada': p.intentosLlamada,
      Notas: p.notas || '',
      'Fecha Creación': p.createdAt.toISOString().split('T')[0]
    }));

    const workbook = await exportService.generarExcel(data, 'Pedidos_Oficina');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pedidos_oficina.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkCambiarEstado = async (req, res) => {
  try {
    const { ids, estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'Se requiere el nuevo estado' });
    }

    const registros = await prisma.pedidoOficina.findMany({ where: { id: { in: ids } } });
    const encontrados = new Map(registros.map(r => [r.id, r]));

    const faltantes = ids.filter(id => !encontrados.has(id));

    const historialOps = ids
      .filter(id => encontrados.has(id))
      .map(id => {
        const actual = encontrados.get(id);
        return prisma.historialCambio.create({
          data: {
            tabla: 'pedidos_oficina',
            registroId: id,
            campo: 'estado',
            valorAnterior: actual.estado,
            valorNuevo: estado,
            usuarioId: req.usuario.id,
            clienteNombre: `${actual.nombre} ${actual.apellido}`
          }
        });
      });

    if (historialOps.length === 0 && faltantes.length > 0) {
      return res.status(404).json({ error: 'Ninguno de los IDs proporcionados existe' });
    }

    await prisma.$transaction([
      ...historialOps,
      prisma.pedidoOficina.updateMany({ where: { id: { in: ids } }, data: { estado } })
    ]);

    wsService.oficinaBulkAction('cambiar_estado', ids, req.usuario);
    res.json({
      message: `Actualizados ${historialOps.length} registros`,
      ...(faltantes.length > 0 && { advertidos: `${faltantes.length} IDs no encontrados` })
    });
  } catch (error) {
    console.error('Bulk cambiar estado oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkAsignar = async (req, res) => {
  try {
    const { ids, asignadoId } = req.body;

    const operador = await prisma.usuario.findUnique({ where: { id: asignadoId } });
    if (!operador) {
      return res.status(404).json({ error: 'Operador no encontrado' });
    }

    const registros = await prisma.pedidoOficina.findMany({ where: { id: { in: ids } } });
    const encontrados = new Map(registros.map(r => [r.id, r]));

    const historialOps = ids
      .filter(id => encontrados.has(id))
      .map(id => {
        const actual = encontrados.get(id);
        return prisma.historialCambio.create({
          data: {
            tabla: 'pedidos_oficina',
            registroId: id,
            campo: 'asignado',
            valorAnterior: actual.asignadoId || null,
            valorNuevo: operador.nombre,
            usuarioId: req.usuario.id,
            clienteNombre: `${actual.nombre} ${actual.apellido}`
          }
        });
      });

    await prisma.$transaction([
      ...historialOps,
      prisma.pedidoOficina.updateMany({ where: { id: { in: ids } }, data: { asignadoId } })
    ]);

    wsService.oficinaBulkAction('asignar', ids, req.usuario);
    res.json({ message: `Asignados ${ids.length} registros a ${operador.nombre}` });
  } catch (error) {
    console.error('Bulk asignar oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkRemove = async (req, res) => {
  try {
    const { ids } = req.body;

    await prisma.$transaction([
      prisma.registroEtiqueta.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_oficina' } }),
      prisma.intentoContacto.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_oficina' } }),
      prisma.historialCambio.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_oficina' } }),
      prisma.transferencia.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_oficina' } }),
      prisma.pedidoOficina.deleteMany({ where: { id: { in: ids } } })
    ]);

    wsService.oficinaBulkAction('eliminar', ids, req.usuario);
    res.json({ message: `Eliminados ${ids.length} registros` });
  } catch (error) {
    console.error('Bulk remove oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const transferir = async (req, res) => {
  try {
    const { id } = req.params;
    const { aUsuarioId, notas } = req.body;

    const pedido = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (req.usuario.rol === 'operador_asignado' && pedido.asignadoId !== req.usuario.id) {
      return res.status(403).json({ error: 'Solo puedes transferir tus propios pedidos' });
    }

    if (!aUsuarioId) {
      return res.status(400).json({ error: 'Se requiere el ID del operador destino' });
    }

    const operadorDestino = await prisma.usuario.findUnique({ where: { id: aUsuarioId } });
    if (!operadorDestino) {
      return res.status(404).json({ error: 'Operador no encontrado' });
    }

    const nombreAnterior = pedido.asignadoId ? (await prisma.usuario.findUnique({ where: { id: pedido.asignadoId } }))?.nombre : null;
    await registrarCambio(id, 'pedidos_oficina', 'asignado', nombreAnterior, operadorDestino.nombre, req.usuario.id, `${pedido.nombre} ${pedido.apellido}`);

    await prisma.transferencia.create({
      data: {
        tabla: 'pedidos_oficina',
        registroId: id,
        deUsuarioId: req.usuario.id,
        aUsuarioId,
        notas
      }
    });

    const pedidoActualizado = await prisma.pedidoOficina.update({
      where: { id },
      data: { asignadoId: aUsuarioId },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    if (operadorDestino.rol === 'admin') {
      const motivo = notas || pedido.producto || 'Pedido de oficina transferido';
      await prisma.tarea.create({
        data: {
          titulo: `${pedido.nombre} ${pedido.apellido}`,
          descripcion: motivo,
          prioridad: 'media',
          estado: 'pendiente',
          creadoPorId: req.usuario.id,
          asignadoId: aUsuarioId,
          origenTipo: 'oficina',
          origenId: id
        }
      });
    }

    wsService.oficinaTransferida(id, req.usuario, aUsuarioId, operadorDestino.nombre, pedidoActualizado);
    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Transferir oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const toggleFavorito = async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const actualizado = await prisma.pedidoOficina.update({
      where: { id },
      data: { favorito: !pedido.favorito },
      select: { id: true, favorito: true }
    });

    res.json(actualizado);
  } catch (error) {
    console.error('Toggle favorito error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const duplicar = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!original) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 7);

    const duplicado = await prisma.pedidoOficina.create({
      data: {
        nombre: original.nombre,
        apellido: original.apellido,
        celular: original.celular,
        producto: original.producto,
        precio: original.precio,
        transportadora: original.transportadora,
        guia: original.guia + '-COPY',
        imagenGuiaUrl: original.imagenGuiaUrl,
        fechaLimite,
        estado: 'pendiente_llamar',
        notas: original.notas,
        notasInternas: original.notasInternas,
        favorito: false,
        createdById: req.usuario.id,
        asignadoId: await getNextOperador('oficina') || null
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    wsService.oficinaCreada(duplicado, req.usuario);
    res.status(201).json(duplicado);
  } catch (error) {
    console.error('Duplicar pedido error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const asignarEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;
    const { etiquetaId } = req.body;

    const pedido = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const existente = await prisma.registroEtiqueta.findFirst({
      where: { etiquetaId, registroId: id, tabla: 'pedidos_oficina' }
    });
    if (existente) {
      return res.status(400).json({ error: 'La etiqueta ya está asignada' });
    }

    await prisma.registroEtiqueta.create({
      data: { etiquetaId, registroId: id, tabla: 'pedidos_oficina' }
    });

    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: id, tabla: 'pedidos_oficina' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    wsService.oficinaEtiquetaChanged(id, req.usuario);
    res.json(etiquetas);
  } catch (error) {
    console.error('Asignar etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const removerEtiqueta = async (req, res) => {
  try {
    const { id, etiquetaId } = req.params;

    await prisma.registroEtiqueta.deleteMany({
      where: { etiquetaId, registroId: id, tabla: 'pedidos_oficina' }
    });

    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: id, tabla: 'pedidos_oficina' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    wsService.oficinaEtiquetaChanged(id, req.usuario);
    res.json(etiquetas);
  } catch (error) {
    console.error('Remover etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const toggleChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { chatActivo } = req.body;

    const pedido = await prisma.pedidoOficina.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const data = chatActivo
      ? { chatActivo: true, fechaUltimoMsjCliente: new Date() }
      : { chatActivo: false, fechaUltimoMsjCliente: null };

    const actualizado = await prisma.pedidoOficina.update({ where: { id }, data });

    res.json({
      id: actualizado.id,
      chatActivo: actualizado.chatActivo,
      fechaUltimoMsjCliente: actualizado.fechaUltimoMsjCliente
    });
  } catch (error) {
    console.error('Toggle chat oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, create, update, cambiarEstado, registrarIntento, remove, getVencimientos, exportarExcel, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta, toggleChat };