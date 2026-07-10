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

    where.estado = { notIn: ['solucionado'] };

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
        where: { etiquetaId, tabla: 'pedidos_novedad' },
        select: { registroId: true }
      });
      where.id = { in: registrosConEtiqueta.map(r => r.registroId) };
    }

    const [novedades, total, transferencias] = await Promise.all([
      prisma.pedidoNovedad.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          createdBy: { select: { id: true, nombre: true } },
          asignado: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pedidoNovedad.count({ where }),
      prisma.transferencia.findMany({
        where: { tabla: 'pedidos_novedad' },
        include: {
          deUsuario: { select: { id: true, nombre: true } },
          aUsuario: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const novedadesIds = novedades.map(n => n.id);
    const todasEtiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: { in: novedadesIds }, tabla: 'pedidos_novedad' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    const etiquetasPorId = {};
    todasEtiquetas.forEach(e => {
      if (!etiquetasPorId[e.registroId]) etiquetasPorId[e.registroId] = [];
      etiquetasPorId[e.registroId].push(e.etiqueta);
    });

    novedades.forEach(n => {
      n._etiquetas = etiquetasPorId[n.id] || [];
    });

    const resultado = paginate(novedades, total, parseInt(page), parseInt(limit));
    resultado.transferencia = transferencias;
    res.json(resultado);
  } catch (error) {
    console.error('Get novedades error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const novedad = await prisma.pedidoNovedad.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    if (!novedad) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    if (req.usuario.rol === 'operador_asignado' && novedad.asignadoId !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes acceso a esta novedad' });
    }

    const chatExpired = await wpService.autoExpireChatWindow('pedidos_novedad', id);
    const respuesta = { ...novedad };
    if (chatExpired) {
      respuesta.chatActivo = false;
    }

    const [historialCambios, intentosContacto, transferencias, etiquetas] = await Promise.all([
      prisma.historialCambio.findMany({
        where: { tabla: 'pedidos_novedad', registroId: id },
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.intentoContacto.findMany({
        where: { tabla: 'pedidos_novedad', registroId: id },
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transferencia.findMany({
        where: { tabla: 'pedidos_novedad', registroId: id },
        include: {
          deUsuario: { select: { id: true, nombre: true } },
          aUsuario: { select: { id: true, nombre: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.registroEtiqueta.findMany({
        where: { tabla: 'pedidos_novedad', registroId: id },
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
    console.error('Get novedad by id error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, apellido, celular, celular2, producto, totalAPagar, transportadora, guia, motivoNovedad, notas, conversacionLink, chatActivo, fechaUltimoMsjCliente } = req.body;

    let asignadoId = await getNextOperador('novedades');
    if (!asignadoId) {
      const admin = await prisma.usuario.findFirst({ where: { rol: 'admin', activo: true }, select: { id: true } });
      asignadoId = admin?.id || req.usuario.id;
    }

    const novedad = await prisma.pedidoNovedad.create({
      data: {
        nombre,
        apellido,
        celular,
        celular2: celular2 || null,
        producto,
        totalAPagar: parseFloat(totalAPagar) || 0,
        transportadora,
        guia,
        motivoNovedad,
        notas,
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

    wsService.novedadCreada(novedad, req.usuario);
    res.status(201).json(novedad);
  } catch (error) {
    console.error('Create novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, celular, celular2, producto, totalAPagar, transportadora, guia, motivoNovedad, notas, conversacionLink } = req.body;

    const actual = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!actual) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const campos = ['nombre', 'apellido', 'celular', 'producto', 'transportadora', 'guia', 'motivoNovedad', 'notas'];
    const clienteNombre = `${actual.nombre} ${actual.apellido}`;
    for (const campo of campos) {
      if (req.body[campo] !== undefined && req.body[campo] !== actual[campo]) {
        await registrarCambio(id, 'pedidos_novedad', campo, actual[campo], req.body[campo], req.usuario.id, clienteNombre);
      }
    }
    if (req.body.totalAPagar !== undefined && Math.abs(parseFloat(req.body.totalAPagar) - actual.totalAPagar) > 0.001) {
      await registrarCambio(id, 'pedidos_novedad', 'totalAPagar', actual.totalAPagar, req.body.totalAPagar, req.usuario.id, clienteNombre);
    }
    if (req.body.conversacionLink !== undefined && req.body.conversacionLink !== (actual.conversacionLink || null)) {
      await registrarCambio(id, 'pedidos_novedad', 'conversacionLink', actual.conversacionLink, req.body.conversacionLink, req.usuario.id, clienteNombre);
    }

    const novedad = await prisma.pedidoNovedad.update({
      where: { id },
      data: {
        nombre, apellido, celular, producto,
        totalAPagar: req.body.totalAPagar !== undefined ? parseFloat(req.body.totalAPagar) : undefined,
        transportadora, guia, motivoNovedad, notas,
        celular2: req.body.celular2 !== undefined ? (req.body.celular2 || null) : undefined,
        conversacionLink: req.body.conversacionLink !== undefined ? (req.body.conversacionLink || null) : undefined
      },
      include: {
        createdBy: { select: { id: true, nombre: true } }
      }
    });

    res.json(novedad);
  } catch (error) {
    console.error('Update novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const actual = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!actual) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    await registrarCambio(id, 'pedidos_novedad', 'estado', actual.estado, estado, req.usuario.id, `${actual.nombre} ${actual.apellido}`);

    const novedad = await prisma.pedidoNovedad.update({
      where: { id },
      data: { estado },
      include: {
        createdBy: { select: { id: true, nombre: true } }
      }
    });

    wsService.novedadEstadoCambiado(id, actual.estado, estado, req.usuario);
    res.json(novedad);
  } catch (error) {
    console.error('Cambiar estado novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.registroEtiqueta.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
    await prisma.intentoContacto.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
    await prisma.historialCambio.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
    await prisma.transferencia.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
    await prisma.pedidoNovedad.delete({ where: { id } });

    wsService.novedadEliminada(id, req.usuario);
    res.json({ message: 'Novedad eliminada' });
  } catch (error) {
    console.error('Remove novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const exportarExcel = async (req, res) => {
  try {
    const { exportService } = require('../services/export.service');
    const novedades = await prisma.pedidoNovedad.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const data = novedades.map(n => ({
      ID: n.id,
      Nombre: `${n.nombre} ${n.apellido}`,
      Celular: n.celular,
      Producto: n.producto,
      'Total a Pagar': n.totalAPagar,
      Transportadora: n.transportadora,
      Guía: n.guia,
      'Motivo Novedad': n.motivoNovedad || '',
      Estado: n.estado,
      'Intentos Llamada': n.intentosLlamada,
      Notas: n.notas || '',
      'Fecha Creación': n.createdAt.toISOString().split('T')[0]
    }));

    const workbook = await exportService.generarExcel(data, 'Novedades');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=novedades.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export novedades error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const registrarIntento = async (req, res) => {
  try {
    const { id } = req.params;
    const { resultado, notas } = req.body;

    const novedad = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!novedad) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    await prisma.intentoContacto.create({
      data: {
        tabla: 'pedidos_novedad',
        registroId: id,
        resultado,
        notas,
        usuarioId: req.usuario.id
      }
    });

    const nuevoIntento = await prisma.pedidoNovedad.update({
      where: { id },
      data: { intentosLlamada: { increment: 1 } },
      include: {
        createdBy: { select: { id: true, nombre: true } }
      }
    });

    res.json(nuevoIntento);
  } catch (error) {
    console.error('Registrar intento novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkCambiarEstado = async (req, res) => {
  try {
    const { ids, estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'Se requiere el nuevo estado' });
    }

    const registros = await prisma.pedidoNovedad.findMany({ where: { id: { in: ids } } });
    const encontrados = new Map(registros.map(r => [r.id, r]));

    const faltantes = ids.filter(id => !encontrados.has(id));

    const historialOps = ids
      .filter(id => encontrados.has(id))
      .map(id => {
        const actual = encontrados.get(id);
        return prisma.historialCambio.create({
          data: {
            tabla: 'pedidos_novedad',
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
      prisma.pedidoNovedad.updateMany({ where: { id: { in: ids } }, data: { estado } })
    ]);

    wsService.novedadBulkAction('cambiar_estado', ids, req.usuario);
    res.json({
      message: `Actualizados ${historialOps.length} registros`,
      ...(faltantes.length > 0 && { advertidos: `${faltantes.length} IDs no encontrados` })
    });
  } catch (error) {
    console.error('Bulk cambiar estado error:', error);
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

    const registros = await prisma.pedidoNovedad.findMany({ where: { id: { in: ids } } });
    const encontrados = new Map(registros.map(r => [r.id, r]));

    const historialOps = ids
      .filter(id => encontrados.has(id))
      .map(id => {
        const actual = encontrados.get(id);
        return prisma.historialCambio.create({
          data: {
            tabla: 'pedidos_novedad',
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
      prisma.pedidoNovedad.updateMany({ where: { id: { in: ids } }, data: { asignadoId } })
    ]);

    wsService.novedadBulkAction('asignar', ids, req.usuario);
    res.json({ message: `Asignados ${ids.length} registros a ${operador.nombre}` });
  } catch (error) {
    console.error('Bulk asignar error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkRemove = async (req, res) => {
  try {
    const { ids } = req.body;

    await prisma.$transaction([
      prisma.registroEtiqueta.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_novedad' } }),
      prisma.intentoContacto.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_novedad' } }),
      prisma.historialCambio.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_novedad' } }),
      prisma.transferencia.deleteMany({ where: { registroId: { in: ids }, tabla: 'pedidos_novedad' } }),
      prisma.pedidoNovedad.deleteMany({ where: { id: { in: ids } } })
    ]);

    wsService.novedadBulkAction('eliminar', ids, req.usuario);
    res.json({ message: `Eliminados ${ids.length} registros` });
  } catch (error) {
    console.error('Bulk remove novedades error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const transferir = async (req, res) => {
  try {
    const { id } = req.params;
    const { aUsuarioId, notas } = req.body;

    const novedad = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!novedad) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    if (req.usuario.rol === 'operador_asignado' && novedad.asignadoId !== req.usuario.id) {
      return res.status(403).json({ error: 'Solo puedes transferir tus propias novedades' });
    }

    if (!aUsuarioId) {
      return res.status(400).json({ error: 'Se requiere el ID del operador destino' });
    }

    const operadorDestino = await prisma.usuario.findUnique({ where: { id: aUsuarioId } });
    if (!operadorDestino) {
      return res.status(404).json({ error: 'Operador no encontrado' });
    }

    const nombreAnterior = novedad.asignadoId ? (await prisma.usuario.findUnique({ where: { id: novedad.asignadoId } }))?.nombre : null;
    await registrarCambio(id, 'pedidos_novedad', 'asignado', nombreAnterior, operadorDestino.nombre, req.usuario.id, `${novedad.nombre} ${novedad.apellido}`);

    await prisma.transferencia.create({
      data: {
        tabla: 'pedidos_novedad',
        registroId: id,
        deUsuarioId: req.usuario.id,
        aUsuarioId,
        notas
      }
    });

    const novedadActualizada = await prisma.pedidoNovedad.update({
      where: { id },
      data: { asignadoId: aUsuarioId },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    if (operadorDestino.rol === 'admin') {
      const motivo = notas || novedad.motivoNovedad || 'Novedad transferida';
      await prisma.tarea.create({
        data: {
          titulo: `${novedad.nombre} ${novedad.apellido}`,
          descripcion: motivo,
          prioridad: 'media',
          estado: 'pendiente',
          creadoPorId: req.usuario.id,
          asignadoId: aUsuarioId,
          origenTipo: 'novedad',
          origenId: id
        }
      });
    }

    wsService.novedadTransferida(id, req.usuario, aUsuarioId, operadorDestino.nombre, novedadActualizada);
    res.json(novedadActualizada);
  } catch (error) {
    console.error('Transferir novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const toggleFavorito = async (req, res) => {
  try {
    const { id } = req.params;
    const novedad = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!novedad) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const actualizada = await prisma.pedidoNovedad.update({
      where: { id },
      data: { favorito: !novedad.favorito },
      select: { id: true, favorito: true }
    });

    res.json(actualizada);
  } catch (error) {
    console.error('Toggle favorito error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const duplicar = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!original) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const duplicada = await prisma.pedidoNovedad.create({
      data: {
        nombre: original.nombre,
        apellido: original.apellido,
        celular: original.celular,
        producto: original.producto,
        totalAPagar: original.totalAPagar,
        transportadora: original.transportadora,
        guia: original.guia + '-COPY',
        motivoNovedad: original.motivoNovedad,
        notas: original.notas,
        estado: 'novedad',
        favorito: false,
        createdById: req.usuario.id,
        asignadoId: await getNextOperador('novedades') || null
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    wsService.novedadCreada(duplicada, req.usuario);
    res.status(201).json(duplicada);
  } catch (error) {
    console.error('Duplicar novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const asignarEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;
    const { etiquetaId } = req.body;

    const novedad = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!novedad) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const existente = await prisma.registroEtiqueta.findFirst({
      where: { etiquetaId, registroId: id, tabla: 'pedidos_novedad' }
    });
    if (existente) {
      return res.status(400).json({ error: 'La etiqueta ya está asignada' });
    }

    await prisma.registroEtiqueta.create({
      data: { etiquetaId, registroId: id, tabla: 'pedidos_novedad' }
    });

    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: id, tabla: 'pedidos_novedad' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    wsService.novedadEtiquetaChanged(id, req.usuario);
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
      where: { etiquetaId, registroId: id, tabla: 'pedidos_novedad' }
    });

    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: id, tabla: 'pedidos_novedad' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    wsService.novedadEtiquetaChanged(id, req.usuario);
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

    const novedad = await prisma.pedidoNovedad.findUnique({ where: { id } });
    if (!novedad) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const data = chatActivo
      ? { chatActivo: true, fechaUltimoMsjCliente: new Date() }
      : { chatActivo: false, fechaUltimoMsjCliente: null };

    const actualizada = await prisma.pedidoNovedad.update({ where: { id }, data });

    res.json({
      id: actualizada.id,
      chatActivo: actualizada.chatActivo,
      fechaUltimoMsjCliente: actualizada.fechaUltimoMsjCliente
    });
  } catch (error) {
    console.error('Toggle chat novedad error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, create, update, cambiarEstado, remove, exportarExcel, registrarIntento, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta, toggleChat };