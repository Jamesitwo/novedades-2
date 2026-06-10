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
      const count = await prisma.pedidoOficina.count({ where: { asignadoId: op.id } });
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
        { nombre: { contains: search } },
        { apellido: { contains: search } },
        { guia: { contains: search } },
        { producto: { contains: search } },
        { celular: { contains: search } }
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

    if (req.usuario.rol === 'operador_asignado' || asignado_a_mi === 'true') {
      where.asignadoId = req.usuario.id;
    }

    if (favorito === 'true') {
      where.favorito = true;
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
      ...pedido,
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
    const { nombre, apellido, celular, producto, precio, transportadora, guia, imagenGuiaUrl, fechaLlegada, notas, notasInternas } = req.body;

    const fechaLimite = fechaLlegada
      ? new Date(new Date(fechaLlegada).getTime() + 7 * 24 * 60 * 60 * 1000)
      : new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);

    const asignadoId = await getNextOperador('oficina');

    const pedido = await prisma.pedidoOficina.create({
      data: {
        nombre,
        apellido,
        celular,
        producto,
        precio: parseFloat(precio) || 0,
        transportadora,
        guia,
        imagenGuiaUrl,
        fechaLimite,
        notas,
        notasInternas,
        createdById: req.usuario.id,
        asignadoId
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

    res.status(201).json(pedido);
  } catch (error) {
    console.error('Create oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, celular, producto, precio, transportadora, guia, imagenGuiaUrl, fechaLlegada, notas, notasInternas } = req.body;

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

    const actualFechaLimiteStr = actual.fechaLimite ? actual.fechaLimite.toISOString().split('T')[0] : null;
    if (fechaLlegada && fechaLlegada !== actualFechaLimiteStr) {
      const nuevaFechaLimite = new Date(new Date(fechaLlegada).getTime() + 7 * 24 * 60 * 60 * 1000);
      await registrarCambio(id, 'pedidos_oficina', 'fecha_limite', actualFechaLimiteStr, nuevaFechaLimite.toISOString(), req.usuario.id, clienteNombre);
    }

    const data = { nombre, apellido, celular, producto, transportadora, guia, imagenGuiaUrl, notas, notasInternas };
    if (req.body.precio !== undefined) data.precio = parseFloat(req.body.precio) || 0;
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

    res.json(nuevoIntento);
  } catch (error) {
    console.error('Registrar intento oficina error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.pedidoOficina.delete({ where: { id } });

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

    const workbook = exportService.generarExcel(data, 'Pedidos_Oficina');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pedidos_oficina.xlsx');
    workbook.xlsx.write(res).then(() => res.end());
  } catch (error) {
    console.error('Export oficina error:', error);
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
        const actual = await prisma.pedidoOficina.findUnique({ where: { id } });
        if (!actual) return { id, success: false, error: 'No encontrado' };

await registrarCambio(id, 'pedidos_oficina', 'estado', actual.estado, estado, req.usuario.id, `${actual.nombre} ${actual.apellido}`);

        await prisma.pedidoOficina.update({
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
    console.error('Bulk cambiar estado oficina error:', error);
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
        const actual = await prisma.pedidoOficina.findUnique({ where: { id } });
        if (!actual) return { id, success: false, error: 'No encontrado' };

        const nombreAnterior = actual.asignadoId ? (await prisma.usuario.findUnique({ where: { id: actual.asignadoId } }))?.nombre : null;
        await registrarCambio(id, 'pedidos_oficina', 'asignado', nombreAnterior, operador.nombre, req.usuario.id, `${actual.nombre} ${actual.apellido}`);

        await prisma.pedidoOficina.update({
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
    console.error('Bulk asignar oficina error:', error);
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
        asignadoId: null
      },
      include: {
        createdBy: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });

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

    res.json(etiquetas);
  } catch (error) {
    console.error('Remover etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, create, update, cambiarEstado, registrarIntento, remove, getVencimientos, exportarExcel, bulkCambiarEstado, bulkAsignar, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta };