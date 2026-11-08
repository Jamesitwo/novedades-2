const prisma = require('../prisma/client').prisma;

/**
 * Asignacion de pedidos LucidSales (tabla propia, independiente de la vinculacion).
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

  return new Map(filas.map(f => [f.lucidsalesPedidoId, {
    asignado: f.asignado || null,
    origen: f.origen,
    estadoPedido: f.estadoPedido ?? null,
    fechaPedido: f.fechaPedido || null,
    updatedAt: f.updatedAt || null
  }]));
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

// Ventana para medir la carga "de ahora" (no el historial completo)
const VENTANA_CARGA_DIAS = Number(process.env.REPARTO_VENTANA_DIAS) || 7;

/**
 * Carga RECIENTE por operador: pedidos que recibio en los ultimos N dias y
 * que todavia son suyos. Es la que se usa para repartir "al de menor carga":
 * con el total historico, un operador con menos antiguedad se llevaria todos
 * los pedidos nuevos hasta alcanzar a los demas.
 *
 * - Tabla propia: asignaciones creadas en la ventana (las copiadas desde la
 *   vinculacion vieja tienen la fecha de la copia, asi que esas no cuentan aca)
 * - Vinculacion vieja: pedidos vinculados en la ventana, si siguen con el mismo dueno
 * @returns {Promise<Map<string, number>>}
 */
async function cargaReciente(operadorIds, tiendaId = null, dias = VENTANA_CARGA_DIAS) {
  if (!Array.isArray(operadorIds) || operadorIds.length === 0) return new Map();
  const desde = new Date(Date.now() - dias * 24 * 3600 * 1000);
  const enTienda = tiendaId ? { tiendaId } : {};

  const [propias, legacy] = await Promise.all([
    prisma.asignacionPedido.findMany({
      where: { asignadoId: { in: operadorIds }, origen: { not: 'migracion' }, createdAt: { gte: desde }, ...enTienda },
      select: { lucidsalesPedidoId: true, asignadoId: true }
    }),
    prisma.pedidoVinculado.findMany({
      where: { asignadoId: { in: operadorIds }, createdAt: { gte: desde }, ...enTienda },
      select: { lucidsalesPedidoId: true, asignadoId: true }
    })
  ]);

  const idsLegacy = legacy.map(l => l.lucidsalesPedidoId);
  const actuales = idsLegacy.length
    ? await prisma.asignacionPedido.findMany({
        where: { lucidsalesPedidoId: { in: idsLegacy } },
        select: { lucidsalesPedidoId: true, asignadoId: true }
      })
    : [];
  const duenoActual = new Map(actuales.map(a => [a.lucidsalesPedidoId, a.asignadoId]));

  const mapa = new Map(operadorIds.map(id => [id, 0]));
  const contados = new Set();
  propias.forEach(p => {
    contados.add(p.lucidsalesPedidoId);
    mapa.set(p.asignadoId, (mapa.get(p.asignadoId) || 0) + 1);
  });
  legacy.forEach(l => {
    if (contados.has(l.lucidsalesPedidoId)) return;
    // si en la tabla propia ya es de otro, no cuenta para el dueno viejo
    if (duenoActual.has(l.lucidsalesPedidoId) && duenoActual.get(l.lucidsalesPedidoId) !== l.asignadoId) return;
    contados.add(l.lucidsalesPedidoId);
    mapa.set(l.asignadoId, (mapa.get(l.asignadoId) || 0) + 1);
  });
  return mapa;
}

/**
 * Reserva `cantidad` turnos del round-robin de la configuracion (el mismo
 * ultimo_indice_round_robin que usa la asignacion al vincular): devuelve el
 * indice del primero y deja guardado el siguiente. Con bloqueo de fila, asi
 * dos procesos no reparten el mismo turno.
 */
async function reservarTurnos(configId, cantidadOperadores, cantidad) {
  return prisma.$transaction(async (tx) => {
    const [fila] = await tx.$queryRawUnsafe(
      'SELECT "ultimo_indice_round_robin" FROM "Configuracion" WHERE "id" = $1 FOR UPDATE',
      configId
    );
    const actual = ((fila?.ultimo_indice_round_robin || 0) % cantidadOperadores + cantidadOperadores) % cantidadOperadores;
    await tx.configuracion.update({
      where: { id: configId },
      data: { ultimo_indice_round_robin: (actual + cantidad) % cantidadOperadores }
    });
    return actual;
  });
}

/**
 * Reparte pedidos sin dueno entre operadores, segun el metodo configurado:
 *   round_robin (por defecto): por turnos, siguiendo el turno guardado en la
 *                configuracion -> todos reciben parejo
 *   menor_carga: cada pedido al que menos pedidos recibio en los ultimos dias
 *
 * @param {number[]} lucidsalesPedidoIds - pedidos sin dueno, en orden
 * @param {{ operadores: Array<{id: string, nombre: string}>, metodo?: string, configId?: string|null,
 *           tiendaId?: string|null, createdById?: string|null, origen?: string }} opts
 * @returns {Promise<Array<{pedidoId: number, asignadoId: string}>>}
 */
async function repartir(lucidsalesPedidoIds, opts = {}) {
  const { operadores = [], metodo = 'round_robin', configId = null, tiendaId = null, createdById = null, origen = 'automatico' } = opts;
  if (!Array.isArray(operadores) || operadores.length === 0) return [];
  if (!Array.isArray(lucidsalesPedidoIds) || lucidsalesPedidoIds.length === 0) return [];

  // orden estable (el mismo que usa la asignacion al vincular)
  const orden = [...operadores].sort((a, b) =>
    String(a.nombre || '').localeCompare(String(b.nombre || '')) || String(a.id).localeCompare(String(b.id))
  );
  const asignaciones = [];

  if (metodo === 'menor_carga') {
    const cargas = await cargaReciente(orden.map(o => o.id), tiendaId);
    for (const pedidoId of lucidsalesPedidoIds) {
      let mejor = orden[0];
      for (const op of orden.slice(1)) {
        if ((cargas.get(op.id) ?? 0) < (cargas.get(mejor.id) ?? 0)) mejor = op;
      }
      await asignar(pedidoId, mejor.id, { tiendaId, createdById, origen });
      cargas.set(mejor.id, (cargas.get(mejor.id) ?? 0) + 1);
      asignaciones.push({ pedidoId: Number(pedidoId), asignadoId: mejor.id });
    }
    return asignaciones;
  }

  // round_robin: se reservan los turnos de una vez y luego se asigna
  const inicio = configId ? await reservarTurnos(configId, orden.length, lucidsalesPedidoIds.length) : 0;
  for (let i = 0; i < lucidsalesPedidoIds.length; i++) {
    const op = orden[(inicio + i) % orden.length];
    await asignar(lucidsalesPedidoIds[i], op.id, { tiendaId, createdById, origen });
    asignaciones.push({ pedidoId: Number(lucidsalesPedidoIds[i]), asignadoId: op.id });
  }
  return asignaciones;
}

module.exports = {
  getAsignaciones,
  asignar,
  asignarBulk,
  cargaPorOperador,
  cargaReciente,
  reservarTurnos,
  repartir
};
