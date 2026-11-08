const { prisma } = require('../prisma/client');
const asignacionPedidosService = require('./asignacion-pedidos.service');
const lucidsalesService = require('./lucidsales.service');

/**
 * Reparto automatico de pedidos LucidSales.
 *
 * Cada N segundos revisa los pedidos recientes de cada tienda y asigna
 * round-robin por menor carga a los que no tienen dueno.
 *
 * Opt-in por tienda: solo corre si Configuracion.auto_asignar_lucidsales
 * esta activo y hay operadores en operadores_incluidos.
 */

const INTERVALO_DEFECTO_MS = 60_000;
const MAX_PEDIDOS_POR_VUELTA = 100;

let timer = null;
let corriendo = false;

/**
 * Operadores elegibles para repartir en una tienda (misma regla que autoAssign).
 */
async function operadoresElegibles(config) {
  let incluidos;
  try {
    incluidos = JSON.parse(config.operadores_incluidos || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(incluidos) || incluidos.length === 0) return [];

  return prisma.usuario.findMany({
    where: {
      id: { in: incluidos },
      activo: true,
      rol: { in: ['admin', 'operador', 'operador_asignado'] },
      tiendaId: config.tiendaId || undefined,
      gestionaPedidos: true
    },
    select: { id: true, nombre: true }
  });
}

/**
 * Una vuelta de reparto para todas las tiendas con auto-asignacion activa.
 * @returns {Promise<number>} total de pedidos asignados
 */
async function vuelta() {
  const configs = await prisma.configuracion.findMany({
    where: { auto_asignar_lucidsales: true },
    select: { tiendaId: true, operadores_incluidos: true, metodo_asignacion: true }
  });

  if (configs.length === 0) return 0;

  let totalAsignados = 0;

  for (const config of configs) {
    const etiqueta = config.tiendaId ? config.tiendaId.slice(0, 8) : 'sin-tienda';
    try {
      const operadores = await operadoresElegibles(config);
      if (operadores.length === 0) {
        console.log(`[reparto] Tienda ${etiqueta}: sin operadores elegibles (revisa operadores_incluidos, tienda y gestionaPedidos)`);
        continue;
      }

      // Pedidos recientes de la tienda, en orden de mas reciente
      const { pedidos } = await lucidsalesService.listPedidosDirecto({
        page: 1,
        itemsPerPage: MAX_PEDIDOS_POR_VUELTA,
        tiendaId: config.tiendaId || null
      });

      const candidatos = (pedidos || []).map(p => p.id).filter(Number.isFinite);
      if (candidatos.length === 0) continue;

      const asignaciones = await asignacionPedidosService.getAsignaciones(candidatos);
      // Los pedidos que solo tienen dueno en la vinculacion legacy NO se
      // reasignan: solo se reparten los que no tienen dueño en ninguna parte.
      const legacy = await prisma.pedidoVinculado.findMany({
        where: { lucidsalesPedidoId: { in: candidatos }, asignadoId: { not: null } },
        select: { lucidsalesPedidoId: true }
      });
      const legacyConDueno = new Set(legacy.map(l => l.lucidsalesPedidoId));

      const sinDueno = candidatos.filter(id => {
        return !asignaciones.get(id) && !legacyConDueno.has(id);
      });

      if (sinDueno.length === 0) continue;

      const asignadas = await asignacionPedidosService.repartir(sinDueno, {
        operadores,
        tiendaId: config.tiendaId || null,
        origen: 'automatico'
      });

      totalAsignados += asignadas.length;
      if (asignadas.length > 0) {
        console.log(`[reparto] Tienda ${etiqueta}: ${asignadas.length} pedidos repartidos`);
      }
    } catch (err) {
      console.error(`[reparto] Error en tienda ${etiqueta}:`, err.message);
    }
  }

  return totalAsignados;
}

async function tick() {
  if (corriendo) return; // evita solapamiento si una vuelta tarda mas que el intervalo
  corriendo = true;
  try {
    await vuelta();
  } catch (err) {
    console.error('[reparto] Error en vuelta:', err.message);
  } finally {
    corriendo = false;
  }
}

/**
 * Arranca el timer. Idempotente: si ya corre, no hace nada.
 * El intervalo se puede fijar con REPARTO_CADA_SEGUNDOS (por defecto 60).
 */
function arrancar() {
  if (timer) return;
  const cada = Number(process.env.REPARTO_CADA_SEGUNDOS) || INTERVALO_DEFECTO_MS;
  timer = setInterval(tick, cada);
  if (timer.unref) timer.unref();
  console.log(`[reparto] Automatico cada ${Math.round(cada / 1000)}s`);
}

function detener() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[reparto] Detenido');
  }
}

module.exports = { arrancar, detener, tick, vuelta };
