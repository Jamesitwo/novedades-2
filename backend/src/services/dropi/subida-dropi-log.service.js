const { prisma } = require('../../prisma/client');

// Estado por pedido de la subida a Dropi.
//   * SubidaDropiLog     -> lo que en ZuntoStore era `procesados[id]`
//   * SubidaDropiIntento -> lo que era `intentos.jsonl` (transparencia en panel)

/** Trae el log de un pedido (o null si nunca se toco). */
async function getLog(tiendaId, lucidsalesPedidoId) {
  const fila = await prisma.subidaDropiLog.findUnique({
    where: {
      tiendaId_lucidsalesPedidoId: { tiendaId, lucidsalesPedidoId: Number(lucidsalesPedidoId) }
    }
  });
  return fila ? aObjetoLog(fila) : null;
}

/** Mapa {lucidsalesPedidoId -> log} para un lote de pedidos. */
async function getLogs(tiendaId, ids) {
  const nums = (ids || []).map(Number).filter(Number.isFinite);
  if (nums.length === 0) return new Map();
  const filas = await prisma.subidaDropiLog.findMany({
    where: { tiendaId, lucidsalesPedidoId: { in: nums } }
  });
  return new Map(filas.map(f => [f.lucidsalesPedidoId, aObjetoLog(f)]));
}

function aObjetoLog(fila) {
  if (!fila) return null;
  const out = { ...fila };
  for (const c of ['cliente', 'analisis', 'dropi']) {
    if (typeof out[c] === 'string' && out[c]) {
      try { out[c] = JSON.parse(out[c]); } catch { out[c] = null; }
    }
  }
  return out;
}

/**
 * Marca un pedido con una accion (upsert). Es el `marcarP` del motor.
 * @param {string|null} tiendaId
 * @param {number} lucidsalesPedidoId
 * @param {string} accion  p.ej. 'subido', 'requiere-humano', 'direccion-invalida'
 * @param {object} extra   {detalle, cliente, analisis, dropi, estadoPedido, configId, incrementarIntento}
 */
async function marcar(tiendaId, lucidsalesPedidoId, accion, extra = {}) {
  const { detalle, cliente, analisis, dropi, estadoPedido, configId, incrementarIntento } = extra;
  const data = {
    accion,
    detalle: detalle != null ? String(detalle).slice(0, 4000) : undefined,
    configId: configId || undefined,
    estadoPedido: estadoPedido != null ? Number(estadoPedido) : undefined
  };
  if (cliente !== undefined) data.cliente = cliente ? JSON.stringify(cliente) : null;
  if (analisis !== undefined) data.analisis = analisis ? JSON.stringify(analisis) : null;
  if (dropi !== undefined) data.dropi = dropi ? JSON.stringify(dropi) : null;
  if (incrementarIntento) data.intentos = { increment: 1 };

  const where = {
    tiendaId_lucidsalesPedidoId: { tiendaId, lucidsalesPedidoId: Number(lucidsalesPedidoId) }
  };
  const update = { ...data };
  delete update.intentos; // el incremento se aplica aparte para no pisarlo
  const fila = await prisma.subidaDropiLog.upsert({
    where,
    update: { ...update, ...(incrementarIntento ? { intentos: { increment: 1 } } : {}) },
    create: {
      tiendaId,
      lucidsalesPedidoId: Number(lucidsalesPedidoId),
      accion,
      detalle: detalle != null ? String(detalle).slice(0, 4000) : null,
      configId: configId || null,
      estadoPedido: estadoPedido != null ? Number(estadoPedido) : null,
      cliente: cliente ? JSON.stringify(cliente) : null,
      analisis: analisis ? JSON.stringify(analisis) : null,
      dropi: dropi ? JSON.stringify(dropi) : null,
      intentos: incrementarIntento ? 1 : 0
    }
  });
  return aObjetoLog(fila);
}

/** Registra un intento individual (historial para el panel). */
async function registrarIntento(tiendaId, lucidsalesPedidoId, accion, detalle, configId = null) {
  // numero correlativo dentro del pedido
  const previos = await prisma.subidaDropiIntento.count({
    where: { tiendaId, lucidsalesPedidoId: Number(lucidsalesPedidoId) }
  });
  return prisma.subidaDropiIntento.create({
    data: {
      tiendaId,
      lucidsalesPedidoId: Number(lucidsalesPedidoId),
      configId,
      numero: previos + 1,
      accion,
      detalle: detalle != null ? String(detalle).slice(0, 4000) : null
    }
  });
}

/** Listado de logs para el panel, con filtros. */
async function listarLogs({ tiendaId, accion, search, page = 1, itemsPerPage = 50 } = {}) {
  const where = { tiendaId };
  if (accion) where.accion = accion;
  if (search) where.detalle = { contains: String(search), mode: 'insensitive' };

  const [total, filas] = await Promise.all([
    prisma.subidaDropiLog.count({ where }),
    prisma.subidaDropiLog.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (Number(page) - 1) * Number(itemsPerPage),
      take: Number(itemsPerPage)
    })
  ]);

  return {
    total,
    page: Number(page),
    numPages: Math.max(1, Math.ceil(total / Number(itemsPerPage))),
    logs: filas.map(aObjetoLog)
  };
}

/** Historial de intentos de un pedido. */
async function listarIntentos(tiendaId, lucidsalesPedidoId) {
  return prisma.subidaDropiIntento.findMany({
    where: { tiendaId, lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    orderBy: { numero: 'asc' }
  });
}

module.exports = { getLog, getLogs, marcar, registrarIntento, listarLogs, listarIntentos, aObjetoLog };
