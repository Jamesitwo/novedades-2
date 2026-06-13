const { prisma } = require('../prisma/client');
const { paginate } = require('../utils/paginate');
const { registrarCambio } = require('./historial.controller');

const getNextOperador = async (tabla) => {
  const config = await prisma.configuracion.findFirst();
  if (!config) return null;

  const field = tabla === 'novedades' ? 'auto_asignar_novedades' : 'auto_asignar_oficina';
  if (!config[field]) return null;

  const operadoresIncluidos = JSON.parse(config.operadores_incluidos || '[]');
  if (operadoresIncluidos.length === 0) return null;

  const activos = await prisma.usuario.findMany({
    where: {
      id: { in: operadoresIncluidos },
      activo: true,
      rol: { in: ['operador', 'operador_asignado'] }
    }
  });

  if (activos.length === 0) return null;

  if (config.metodo_asignacion === 'menor_carga') {
    const counts = await Promise.all(activos.map(async (op) => {
      const count = await prisma.pedidoNovedad.count({ where: { asignadoId: op.id } });
      return { op, count };
    }));
    counts.sort((a, b) => a.count - b.count);
    return counts[0].op.id;
  } else {
    const ultimoIndice = config.ultimo_indice_round_robin || 0;
    const siguienteIndice = (ultimoIndice + 1) % activos.length;
    await prisma.configuracion.update({
      where: { id: config.id },
      data: { ultimo_indice_round_robin: siguienteIndice }
    });
    return activos[siguienteIndice - 1 >= 0 ? siguienteIndice - 1 : activos.length - 1].id;
  }
};

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, estados, estado, transportadora, search, fechaDesde, fechaHasta, asignado_a_mi, favorito, guiaDesde, guiaHasta, etiquetaId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (estados) {
      const estadosArray = JSON.parse(estados);
      if (estadosArray.length > 0) {
        where.estado = { in: estadosArray };
      }
    } else if (estado) {
      where.estado = estado;
    }

    if (transportadora) where.transportadora = { contains: transportadora };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { guia: { contains: search, mode: 'insensitive' } },
        { producto: { contains: search, mode: 'insensitive' } },
        { celular: { contains: search, mode: 'insensitive' } }
      ];
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
      ...novedad,
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
    const { nombre, apellido, celular, celular2, producto, totalAPagar, transportadora, guia, motivoNovedad, notas, conversacionLink } = req.body;

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
        createdById: req.usuario.id,
        asignadoId
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

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
    if (req.body.totalAPagar !== undefined && parseFloat(req.body.totalAPagar) !== actual.totalAPagar) {
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

    const workbook = exportService.generarExcel(data, 'Novedades');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=novedades.xlsx');
    workbook.xlsx.write(res).then(() => res.end());
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

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs' });
    }

    if (!estado) {
      return res.status(400).json({ error: 'Se requiere el nuevo estado' });
    }

    const resultados = await Promise.all(ids.map(async (id) => {
      try {
        const actual = await prisma.pedidoNovedad.findUnique({ where: { id } });
        if (!actual) return { id, success: false, error: 'No encontrado' };

await registrarCambio(id, 'pedidos_novedad', 'estado', actual.estado, estado, req.usuario.id, `${actual.nombre} ${actual.apellido}`);

        await prisma.pedidoNovedad.update({
          where: { id },
          data: { estado }
        });

        return { id, success: true };
      } catch (error) {
        return { id, success: false, error: error.message };
      }
    }));

    const exitosos = resultados.filter(r => r.success).length;

    res.json({
      message: `Actualizados ${exitosos} registros`,
      detalles: resultados
    });
  } catch (error) {
    console.error('Bulk cambiar estado error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkAsignar = async (req, res) => {
  try {
    const { ids, asignadoId } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs' });
    }

    if (!asignadoId) {
      return res.status(400).json({ error: 'Se requiere el ID del operador' });
    }

    const operador = await prisma.usuario.findUnique({ where: { id: asignadoId } });
    if (!operador) {
      return res.status(404).json({ error: 'Operador no encontrado' });
    }

    const resultados = await Promise.all(ids.map(async (id) => {
      try {
        const actual = await prisma.pedidoNovedad.findUnique({ where: { id } });
        if (!actual) return { id, success: false, error: 'No encontrado' };

        const nombreAnterior = actual.asignadoId ? (await prisma.usuario.findUnique({ where: { id: actual.asignadoId } }))?.nombre : null;
        await registrarCambio(id, 'pedidos_novedad', 'asignado', nombreAnterior, operador.nombre, req.usuario.id, `${actual.nombre} ${actual.apellido}`);

        await prisma.pedidoNovedad.update({
          where: { id },
          data: { asignadoId }
        });

        return { id, success: true };
      } catch (error) {
        return { id, success: false, error: error.message };
      }
    }));

    const exitosos = resultados.filter(r => r.success).length;

    res.json({
      message: `Asignados ${exitosos} registros a ${operador.nombre}`,
      detalles: resultados
    });
  } catch (error) {
    console.error('Bulk asignar error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkRemove = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de IDs' });
    }

    const resultados = await Promise.all(ids.map(async (id) => {
      try {
        await prisma.registroEtiqueta.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
        await prisma.intentoContacto.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
        await prisma.historialCambio.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
        await prisma.transferencia.deleteMany({ where: { registroId: id, tabla: 'pedidos_novedad' } });
        await prisma.pedidoNovedad.delete({ where: { id } });
        return { id, success: true };
      } catch (error) {
        return { id, success: false, error: error.message };
      }
    }));

    const exitosos = resultados.filter(r => r.success).length;

    res.json({
      message: `Eliminados ${exitosos} registros`,
      detalles: resultados
    });
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
        asignadoId: null
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

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

    res.json(etiquetas);
  } catch (error) {
    console.error('Remover etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, create, update, cambiarEstado, remove, exportarExcel, registrarIntento, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta };