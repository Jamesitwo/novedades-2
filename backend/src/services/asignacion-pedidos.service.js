const prisma = require('../prisma/client').prisma;

/**
 * Asignacion de pedidos LucidSales (estilo ZuntoStore).
 *
 * Tabla propia `asignaciones_pedido`, separada de la vinculacion:
 * un pedido aparece en la lista solo por pertenecer a la tienda y
 * esta tabla guarda unicamente quien es su dueno.
 */

/**
 * Mapa lucidsalesPedidoId -> asignacion de un lote de pedidos.
 * @param {number[]} lucidsalesPedidoIds
 * @returns {Promise<Map<number, {asignado: {id: string, nombre: string} | null, origen: string}>>}
 */
async function getAsignaciones(lucidsalesPedidoIds) {
  const ids = (lucidsalesPedidoIds || []).map(Number).filter(Number.isFinite);
  if (ids.length === 0) return new Map();

  const filas = await prisma.asignacionPedido.findMany({
    where: { lucidsalesPedidoId: { in: ids } },
    include: { asignado: { select: { id: true, nombre: true } } }
  });

  return new Map(filas.map(f => [f.lucidsalesPedidoId, { asignado: f.asignado || null, origen: f.origen }]));
}

/**
 * Asigna (o desasigna) un pedido a un operador.
 * @param {number} lucidsalesPedidoId
 * @param {string|null} asignadoId
 * @param {{ tiendaId?: string|null, createdById?: string|null, origen?: string }} opts
 */
async function asignar(lucidsalesPedidoId, asignadoId, opts = {}) {
  const { tiendaId = null, createdById = null, origen = 'manual' } = opts;
  const data = { asignadoId: asignadoId || null, origen };

  return prisma.asignacionPedido.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: data,
    create: {
      lucidsalesPedidoId: Number(lucidsalesPedidoId),
      tiendaId,
      createdById,
      ...data
    },
    include: { asignado: { select: { id: true, nombre: true } } }
  });
}

/**
 * Asigna varios pedidos al mismo operador (bulk de la lista).
 * @param {number[]} lucidsalesPedidoIds
 * @param {string|null} asignadoId
 */
async function asignarBulk(lucidsalesPedidoIds, asignadoId, opts = {}) {
  const { tiendaId = null, createdById = null, origen = 'manual' } = opts;
  const ids = (lucidsalesPedidoIds || []).map(Number).filter(Number.isFinite);
  if (ids.length === 0) return { afectados: 0 };

  const data = { asignadoId: asignadoId || null, origen };

  const [creados, actualizados] = await Promise.all([
    prisma.asignacionPedido.createMany({
      data: ids.map(id => ({ lucidsalesPedidoId: id, tiendaId, createdById, ...data })),
      skipDuplicates: true
    }),
    prisma.asignacionPedido.updateMany({
      where: { lucidsalesPedidoId: { in: ids } },
      data
    })
  ]);

  return { afectados: creados.count + actualizados.count };
}

/**
 * Carga actual de pedidos por operador (para elegir el de menor carga).
 * Cuenta los de la tabla propia mas los que aun solo tienen dueno en la
 * vinculacion legacy, para no cargar de mas a nadie durante la transicion.
 * @param {string[]} operadorIds
 * @param {string|null} tiendaId
 * @returns {Promise<Map<string, number>>}
 */
async function cargaPorOperador(operadorIds, tiendaId = null) {
  if (!Array.isArray(operadorIds) || operadorIds.length === 0) return new Map();

  const [conteos, legacy, propias] = await Promise.all([
    prisma.asignacionPedido.groupBy({
      by: ['asignadoId'],
      where: { asignadoId: { in: operadorIds }, tiendaId: tiendaId || undefined },
      _count: { _all: true }
    }),
    prisma.pedidoVinculado.findMany({
      where: { asignadoId: { in: operadorIds }, tiendaId: tiendaId || undefined },
      select: { lucidsalesPedidoId: true, asignadoId: true }
    }),
    prisma.asignacionPedido.findMany({
      select: { lucidsalesPedidoId: true }
    })
  ]);

  const propiasSet = new Set(propias.map(p => p.lucidsalesPedidoId));
  const mapa = new Map(operadorIds.map(id => [id, 0]));

  conteos.forEach(c => {
    if (c.asignadoId) mapa.set(c.asignadoId, c._count._all);
  });

  // Solo lo que NO fue migrado a la tabla propia se suma como legacy
  legacy.forEach(l => {
    if (!propiasSet.has(l.lucidsalesPedidoId)) {
      mapa.set(l.asignadoId, (mapa.get(l.asignadoId) || 0) + 1);
    }
  });

  return mapa;
}

/**
 * Reparto round-robin por menor carga: asigna cada pedido al operador
 * con menos pedidos asignados. Desempate por nombre para que sea estable.
 *
 * @param {number[]} lucidsalesPedidoIds - pedidos sin dueno, en orden
 * @param {{ operadores: Array<{id: string, nombre: string}>, tiendaId?: string|null, createdById?: string|null, origen?: string }} opts
 * @returns {Promise<Array<{pedidoId: number, asignadoId: string}>>}
 */
async function repartir(lucidsalesPedidoIds, opts = {}) {
  const { operadores = [], tiendaId = null, createdById = null, origen = 'automatico' } = opts;
  if (!Array.isArray(operadores) || operadores.length === 0) return [];
  if (!Array.isArray(lucidsalesPedidoIds) || lucidsalesPedidoIds.length === 0) return [];

  const orden = [...operadores].sort((a, b) =>
    String(a.nombre || '').localeCompare(String(b.nombre || ''))
  );

  const cargas = await cargaPorOperador(orden.map(o => o.id), tiendaId);
  const asignaciones = [];

  for (const pedidoId of lucidsalesPedidoIds) {
    let mejor = orden[0];
    let mejorCarga = cargas.get(mejor.id) ?? 0;

    for (const op of orden.slice(1)) {
      const carga = cargas.get(op.id) ?? 0;
      if (carga < mejorCarga) {
        mejor = op;
        mejorCarga = carga;
      }
    }

    await asignar(pedidoId, mejor.id, { tiendaId, createdById, origen });
    cargas.set(mejor.id, mejorCarga + 1);
    asignaciones.push({ pedidoId: Number(pedidoId), asignadoId: mejor.id });
  }

  return asignaciones;
}

module.exports = {
  getAsignaciones,
  asignar,
  asignarBulk,
  cargaPorOperador,
  repartir
};
