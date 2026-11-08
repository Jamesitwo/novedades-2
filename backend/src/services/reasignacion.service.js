// Reasignacion masiva de pedidos de LucidSales entre operadores.
//
// Caso tipico: un operador sale, se va de vacaciones o esta saturado, y sus
// pedidos (los que siguen vivos) pasan a otro u otros operadores.
//
//   1. candidatos: pedidos de los operadores de origen (tabla propia
//      asignaciones_pedido + dueno legacy de pedidos_vinculados)
//   2. filtro por estado / fecha: siempre contra LucidSales (la copia de
//      estado de la base puede estar vieja)
//   3. reparto: a un operador, por partes iguales o al de menor carga, o
//      dejarlos sin asignar
//   4. se aplica como un LOTE (bitacora tipo reasignacion_masiva) que se puede
//      deshacer: vuelve cada pedido a su dueno anterior salvo que alguien lo
//      haya movido despues
const crypto = require('crypto');
const { prisma } = require('../prisma/client');
const lucidsalesService = require('./lucidsales.service');
const asignacionPedidosService = require('./asignacion-pedidos.service');
const bitacoraService = require('./bitacora.service');

const ESTADOS = {
  0: 'Por confirmar', 1: 'Cancelado', 2: 'Confirmado', 3: 'Modificado', 4: 'En tránsito',
  5: 'En reparto', 6: 'Entregado', 7: 'Devuelto', 8: 'En novedad', 9: 'Novedad solucionada'
};
const POR_PAGINA_API = 100;
const MAX_PEDIDOS_API = 30000; // mas que esto: acotar con fechas
const PAGINAS_EN_PARALELO = 6;
const MAX_LOTE = 20000;
const TIPO_LOTE = 'reasignacion_masiva';
const TIPO_DESHECHO = 'reasignacion_deshecha';

/** findMany con `in` partido en bloques (Postgres admite ~32k parametros). */
async function enBloques(ids, fn, tam = 5000) {
  const salida = [];
  for (let i = 0; i < ids.length; i += tam) salida.push(...(await fn(ids.slice(i, i + tam))));
  return salida;
}

function errorUsuario(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

/** Operadores validos de la tienda (activos), por id. */
async function operadoresPorId(ids) {
  const lista = ids.length
    ? await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, activo: true } })
    : [];
  return new Map(lista.map(u => [u.id, u]));
}

/**
 * Ids de LucidSales que HOY estan en esos estados / fechas, segun la API.
 * Se lee la primera pagina para saber el total y el resto en paralelo. Si
 * son demasiados se pide acotar con fechas (mejor que un resultado a medias).
 */
async function idsSegunApi({ estados, fechaDesde, fechaHasta, tiendaId }) {
  const filters = lucidsalesService.filtrosApi({ estados, fechaDesde, fechaHasta });
  const ids = new Set();
  const estadoPorId = new Map();
  const tomar = res => {
    for (const p of Array.isArray(res.pedidos) ? res.pedidos : []) {
      const id = Number(p.id);
      if (!Number.isFinite(id)) continue;
      ids.add(id);
      estadoPorId.set(id, Number(p.EstadoPedido ?? 0));
    }
  };
  const primera = await lucidsalesService.getPedidos({ page: 1, itemsPerPage: POR_PAGINA_API, filters, tiendaId });
  const total = Number(primera.totalRecords || 0);
  if (total > MAX_PEDIDOS_API) {
    throw errorUsuario(`En LucidSales hay ${total.toLocaleString('es-CO')} pedidos con esos estados${fechaDesde || fechaHasta ? ' y fechas' : ''}: acota con un rango de fechas (máximo ${MAX_PEDIDOS_API.toLocaleString('es-CO')}).`);
  }
  tomar(primera);
  const paginas = Math.ceil(total / POR_PAGINA_API);
  const resto = [];
  for (let page = 2; page <= paginas; page++) resto.push(page);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(PAGINAS_EN_PARALELO, resto.length) }, async () => {
    while (i < resto.length) {
      const page = resto[i++];
      tomar(await lucidsalesService.getPedidos({ page, itemsPerPage: POR_PAGINA_API, filters, tiendaId }));
    }
  }));
  return { ids, estadoPorId, total };
}

/**
 * Pedidos que se moverian. params:
 *   origenIds: string[]      operadores de los que salen los pedidos
 *   estados:  number[]|null  null/[] = todos los estados
 *   fechaDesde, fechaHasta:  'YYYY-MM-DD' (fecha del pedido) opcionales
 */
async function candidatos({ tiendaId, origenIds, estados, fechaDesde, fechaHasta }) {
  if (!Array.isArray(origenIds) || origenIds.length === 0) throw errorUsuario('Elige al menos un operador de origen');

  // 1. pedidos de cada operador de origen
  const origenPorId = new Map();
  for (const op of origenIds) {
    const ids = await lucidsalesService.idsAsignadosA(op, tiendaId);
    ids.forEach(id => origenPorId.set(id, op));
  }
  let ids = [...origenPorId.keys()];
  const filtraEstado = Array.isArray(estados) && estados.length > 0 && estados.length < 10;
  const filtraFecha = Boolean(fechaDesde || fechaHasta);
  const estadoPorId = new Map();

  if (ids.length && (filtraEstado || filtraFecha)) {
    // el estado guardado en la base puede estar viejo (se copia al subir y no
    // siempre se refresca): para mover pedidos en bloque manda LucidSales
    const api = await idsSegunApi({ estados: filtraEstado ? estados : null, fechaDesde, fechaHasta, tiendaId });
    api.estadoPorId.forEach((e, id) => estadoPorId.set(id, e));
    ids = ids.filter(id => api.ids.has(id));

    // de paso, la copia de estado queda al dia para la lista y los filtros
    const porEstado = new Map();
    ids.forEach(id => {
      const e = api.estadoPorId.get(id);
      if (!porEstado.has(e)) porEstado.set(e, []);
      porEstado.get(e).push(id);
    });
    for (const [e, lista] of porEstado) {
      await enBloques(lista, async b => {
        await prisma.asignacionPedido.updateMany({ where: { lucidsalesPedidoId: { in: b } }, data: { estadoPedido: e } });
        return [];
      });
    }
  }

  ids.sort((a, b) => b - a);
  return { ids, origenPorId, estadoPorId };
}

/**
 * A quien va cada pedido.
 *   modo 'uno'         -> destinoIds[0]
 *   modo 'equitativo'  -> por turnos entre los destinos
 *   modo 'menor_carga' -> siempre al que menos pedidos tenga (contando los que va recibiendo)
 *   modo 'sin_asignar' -> null
 */
async function planDeReparto(ids, { modo, destinoIds, tiendaId }) {
  const plan = new Map();
  if (modo === 'sin_asignar') {
    ids.forEach(id => plan.set(id, null));
    return plan;
  }
  if (!Array.isArray(destinoIds) || destinoIds.length === 0) throw errorUsuario('Elige el operador (o los operadores) que reciben los pedidos');
  if (modo === 'uno') {
    ids.forEach(id => plan.set(id, destinoIds[0]));
    return plan;
  }
  if (modo === 'equitativo') {
    ids.forEach((id, i) => plan.set(id, destinoIds[i % destinoIds.length]));
    return plan;
  }
  if (modo === 'menor_carga') {
    const cargas = await asignacionPedidosService.cargaPorOperador(destinoIds, tiendaId);
    for (const id of ids) {
      let mejor = destinoIds[0];
      for (const d of destinoIds) if ((cargas.get(d) ?? 0) < (cargas.get(mejor) ?? 0)) mejor = d;
      plan.set(id, mejor);
      cargas.set(mejor, (cargas.get(mejor) ?? 0) + 1);
    }
    return plan;
  }
  throw errorUsuario(`Modo de reparto desconocido: ${modo}`);
}

function validar(params) {
  const { origenIds = [], destinoIds = [], modo } = params;
  if (!['uno', 'equitativo', 'menor_carga', 'sin_asignar'].includes(modo)) throw errorUsuario('Elige cómo repartir los pedidos');
  if (modo === 'uno' && destinoIds.length !== 1) throw errorUsuario('Elige un operador de destino');
  const cruzados = destinoIds.filter(d => origenIds.includes(d));
  if (cruzados.length) throw errorUsuario('Un operador no puede ser origen y destino a la vez');
}

async function calcular(params) {
  validar(params);
  const todos = [...new Set([...(params.origenIds || []), ...(params.destinoIds || [])])];
  const ops = await operadoresPorId(todos);
  const faltan = todos.filter(id => !ops.has(id));
  if (faltan.length) throw errorUsuario('Alguno de los operadores elegidos ya no existe', 404);
  const inactivos = (params.destinoIds || []).filter(id => ops.get(id)?.activo === false);
  if (inactivos.length) throw errorUsuario(`${ops.get(inactivos[0]).nombre} está inactivo: no puede recibir pedidos`);

  const c = await candidatos(params);
  if (c.ids.length > MAX_LOTE) throw errorUsuario(`Son ${c.ids.length} pedidos: el máximo por lote es ${MAX_LOTE}. Filtra por estado o fecha.`);
  const plan = await planDeReparto(c.ids, { modo: params.modo, destinoIds: params.destinoIds, tiendaId: params.tiendaId });
  return { ...c, plan, ops };
}

function resumen({ ids, origenPorId, estadoPorId, plan, ops }) {
  const porEstado = {};
  const porOrigen = {};
  const porDestino = {};
  for (const id of ids) {
    const e = estadoPorId.has(id) ? String(estadoPorId.get(id)) : 'desconocido';
    porEstado[e] = (porEstado[e] || 0) + 1;
    const o = origenPorId.get(id);
    porOrigen[o] = (porOrigen[o] || 0) + 1;
    const d = plan.get(id) ?? '__sin__';
    porDestino[d] = (porDestino[d] || 0) + 1;
  }
  const nombre = id => (id === '__sin__' ? 'Sin asignar' : ops.get(id)?.nombre || id);
  return {
    total: ids.length,
    porEstado: Object.entries(porEstado).map(([e, n]) => ({ estado: e === 'desconocido' ? null : Number(e), nombre: e === 'desconocido' ? 'Sin confirmar' : ESTADOS[e], cantidad: n })).sort((a, b) => b.cantidad - a.cantidad),
    porOrigen: Object.entries(porOrigen).map(([id, n]) => ({ id, nombre: nombre(id), cantidad: n })),
    porDestino: Object.entries(porDestino).map(([id, n]) => ({ id: id === '__sin__' ? null : id, nombre: nombre(id), cantidad: n })).sort((a, b) => b.cantidad - a.cantidad),
    muestra: ids.slice(0, 12).map(id => ({ id, estado: estadoPorId.get(id) ?? null, de: nombre(origenPorId.get(id)), a: nombre(plan.get(id) ?? '__sin__') }))
  };
}

async function previsualizar(params) {
  return resumen(await calcular(params));
}

async function ejecutar(params, usuario) {
  const calc = await calcular(params);
  const { ids, origenPorId, plan, ops } = calc;
  if (ids.length === 0) return { lote: null, ...resumen(calc) };
  const lote = crypto.randomUUID();
  const opciones = { tiendaId: params.tiendaId || null, createdById: usuario.id, origen: 'reasignacion' };

  // por destino, en bloques (un updateMany/createMany por destino)
  const porDestino = new Map();
  ids.forEach(id => {
    const d = plan.get(id) ?? null;
    if (!porDestino.has(d)) porDestino.set(d, []);
    porDestino.get(d).push(id);
  });
  for (const [destino, lista] of porDestino) {
    await asignacionPedidosService.asignarBulk(lista, destino, opciones);
  }

  // historial por pedido (como la asignacion de uno en uno)
  const nombre = id => (id ? ops.get(id)?.nombre || null : null);
  const filas = ids.map(id => ({
    tabla: 'pedidos_vinculados',
    registroId: String(id),
    campo: 'asignado',
    valorAnterior: nombre(origenPorId.get(id)),
    valorNuevo: nombre(plan.get(id) ?? null),
    usuarioId: usuario.id,
    tiendaId: params.tiendaId || null
  }));
  for (let i = 0; i < filas.length; i += 1000) {
    await prisma.historialCambio.createMany({ data: filas.slice(i, i + 1000) });
  }

  const res = resumen(calc);
  const destinos = res.porDestino.map(d => `${d.nombre} (${d.cantidad})`).join(', ');
  const origenes = res.porOrigen.map(o => o.nombre).join(', ');
  await bitacoraService.registrar({
    tipo: TIPO_LOTE,
    entidad: 'pedido_lucidsales',
    registroId: lote,
    operadorId: usuario.id,
    valorAnterior: origenes,
    valorNuevo: destinos,
    descripcion: `Reasignación masiva: ${ids.length} pedido(s) de ${origenes} → ${destinos}`,
    detalle: {
      lote,
      filtros: { estados: params.estados || null, fechaDesde: params.fechaDesde || null, fechaHasta: params.fechaHasta || null },
      modo: params.modo,
      origenIds: params.origenIds,
      destinoIds: params.destinoIds || [],
      // i = pedido, d = dueno anterior, a = dueno nuevo (para deshacer)
      cambios: ids.map(id => ({ i: id, d: origenPorId.get(id) || null, a: plan.get(id) ?? null }))
    },
    tiendaId: params.tiendaId || null
  });
  return { lote, ...res };
}

async function lotes(tiendaId, limite = 20) {
  const filas = await prisma.actividadLog.findMany({
    where: { tipo: TIPO_LOTE, ...(tiendaId ? { tiendaId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limite,
    include: { operador: { select: { id: true, nombre: true } } }
  });
  const deshechos = filas.length
    ? await prisma.actividadLog.findMany({ where: { tipo: TIPO_DESHECHO, registroId: { in: filas.map(f => f.registroId) } } })
    : [];
  const deshechoPor = new Map(deshechos.map(d => [d.registroId, d]));
  return filas.map(f => {
    let det = {};
    try { det = JSON.parse(f.detalle || '{}'); } catch { /* sin detalle */ }
    const d = deshechoPor.get(f.registroId);
    return {
      lote: f.registroId,
      fecha: f.createdAt,
      por: f.operador?.nombre || null,
      total: Array.isArray(det.cambios) ? det.cambios.length : 0,
      origenes: f.valorAnterior,
      destinos: f.valorNuevo,
      modo: det.modo || null,
      filtros: det.filtros || null,
      deshecho: d ? { fecha: d.createdAt, descripcion: d.descripcion } : null
    };
  });
}

/** Devuelve cada pedido del lote a su dueno anterior, si nadie lo movio despues. */
async function deshacer(loteId, usuario, tiendaId) {
  const fila = await prisma.actividadLog.findFirst({ where: { tipo: TIPO_LOTE, registroId: loteId, ...(tiendaId ? { tiendaId } : {}) } });
  if (!fila) throw errorUsuario('No se encontró ese lote', 404);
  const ya = await prisma.actividadLog.findFirst({ where: { tipo: TIPO_DESHECHO, registroId: loteId } });
  if (ya) throw errorUsuario('Ese lote ya se deshizo', 409);
  let det;
  try { det = JSON.parse(fila.detalle || '{}'); } catch { det = {}; }
  const cambios = Array.isArray(det.cambios) ? det.cambios : [];
  if (!cambios.length) throw errorUsuario('El lote no tiene cambios guardados');

  const actuales = await asignacionPedidosService.getAsignaciones(cambios.map(c => c.i));
  const devolver = new Map(); // dueno anterior -> ids
  let movidosDespues = 0;
  for (const c of cambios) {
    const hoy = actuales.get(c.i)?.asignado?.id ?? null;
    if (hoy !== (c.a ?? null)) {
      movidosDespues++;
      continue;
    }
    const k = c.d ?? null;
    if (!devolver.has(k)) devolver.set(k, []);
    devolver.get(k).push(c.i);
  }
  const ops = await operadoresPorId([...new Set(cambios.flatMap(c => [c.d, c.a]).filter(Boolean))]);
  let devueltos = 0;
  for (const [dueno, ids] of devolver) {
    await asignacionPedidosService.asignarBulk(ids, dueno, { tiendaId: tiendaId || null, createdById: usuario.id, origen: 'reasignacion' });
    devueltos += ids.length;
    const filas = ids.map(i => {
      const c = cambios.find(x => x.i === i);
      return {
        tabla: 'pedidos_vinculados', registroId: String(i), campo: 'asignado',
        valorAnterior: ops.get(c.a)?.nombre || null, valorNuevo: ops.get(dueno)?.nombre || null,
        usuarioId: usuario.id, tiendaId: tiendaId || null
      };
    });
    for (let j = 0; j < filas.length; j += 1000) await prisma.historialCambio.createMany({ data: filas.slice(j, j + 1000) });
  }
  const descripcion = `Reasignación deshecha: ${devueltos} pedido(s) devueltos${movidosDespues ? `, ${movidosDespues} se dejaron como están (alguien los movió después)` : ''}`;
  await bitacoraService.registrar({
    tipo: TIPO_DESHECHO,
    entidad: 'pedido_lucidsales',
    registroId: loteId,
    operadorId: usuario.id,
    descripcion,
    detalle: { lote: loteId, devueltos, movidosDespues },
    tiendaId: tiendaId || null
  });
  return { devueltos, movidosDespues, descripcion };
}

/**
 * Operadores de la tienda con su carga actual (para elegir origen y destino).
 * Incluye inactivos: un operador que salio puede tener pedidos por repartir
 * (como origen), aunque ya no pueda recibir.
 */
async function operadoresConCarga(tiendaId) {
  const ops = await prisma.usuario.findMany({
    where: { rol: { in: ['admin', 'operador', 'operador_asignado'] }, ...(tiendaId ? { tiendaId } : {}) },
    select: { id: true, nombre: true, rol: true, activo: true },
    orderBy: { nombre: 'asc' }
  });
  const cargas = await asignacionPedidosService.cargaPorOperador(ops.map(o => o.id), tiendaId);
  return ops
    .map(o => ({ ...o, carga: cargas.get(o.id) ?? 0 }))
    .filter(o => o.activo || o.carga > 0);
}

module.exports = { previsualizar, ejecutar, lotes, deshacer, operadoresConCarga, candidatos, planDeReparto, ESTADOS };
