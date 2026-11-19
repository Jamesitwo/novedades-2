// Cambio de estado masivo de pedidos de LucidSales (solo admin).
//
// LucidSales no tiene un endpoint solo para el estado: para cambiarlo hay que
// mandar el pedido completo. Por cada pedido: se lee en vivo, se le cambia
// solo `EstadoPedido`, se guarda, se actualizan las copias locales (lista y
// filtros) y queda en la bitacora. Corre en segundo plano y el panel consulta
// el progreso, asi un lote grande no se corta por timeout.
const crypto = require('crypto');
const { prisma } = require('../prisma/client');
const lucidsalesService = require('./lucidsales.service');
const bitacoraService = require('./bitacora.service');

const ESTADOS = {
  0: 'Por confirmar', 1: 'Cancelado', 2: 'Confirmado', 3: 'Modificado',
  4: 'En Tránsito', 5: 'En Reparto', 6: 'Entregado', 7: 'Devuelto',
  8: 'En Novedad', 9: 'Novedad Solucionada'
};
const MAX_PEDIDOS = 500;
const EN_PARALELO = 3;
const GUARDAR_TRABAJO_MS = 60 * 60 * 1000;

const trabajos = new Map(); // id -> trabajo

function errorUsuario(msg, status = 400) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

function observaciones(v) {
  if (Array.isArray(v)) return [...v];
  if (typeof v === 'string' && v.trim()) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p; } catch { /* texto suelto */ }
    return [{ desc: v }];
  }
  return [];
}

function vista(t) {
  return {
    id: t.id,
    estado: t.estado,
    estadoNuevo: t.estadoNuevo,
    estadoNombre: ESTADOS[t.estadoNuevo],
    total: t.total,
    procesados: t.procesados,
    cambiados: t.cambiados,
    yaEstaban: t.yaEstaban,
    fallidos: t.fallidos,
    inicio: t.inicio,
    fin: t.fin
  };
}

async function cambiarUno(id, t) {
  const pedido = await lucidsalesService.getPedidoById(id, t.tiendaId);
  const anterior = Number(pedido.EstadoPedido ?? 0);
  if (anterior === t.estadoNuevo) { t.yaEstaban++; return; }

  const nuevo = { ...pedido, EstadoPedido: t.estadoNuevo };
  if (t.motivo) {
    // igual que el cambio de estado de un pedido: el motivo queda en sus observaciones
    nuevo.Observaciones = JSON.stringify([...observaciones(pedido.Observaciones), { desc: t.motivo, update: new Date().toISOString(), user: t.usuarioNombre || 'Sistema' }]);
  }
  const r = await lucidsalesService.updatePedido(nuevo, t.tiendaId);
  if (r && r.ok === false) throw new Error(r.msg || r.error || 'LucidSales rechazo el cambio');
  t.cambiados++;

  // copias locales: la lista y el filtro "asignado a" las usan
  await Promise.all([
    prisma.asignacionPedido.updateMany({ where: { lucidsalesPedidoId: id }, data: { estadoPedido: t.estadoNuevo } }),
    prisma.pedidoVinculado.updateMany({ where: { lucidsalesPedidoId: id }, data: { estadoPedido: t.estadoNuevo } })
  ]).catch(e => console.warn('[CambioEstado] copia local', id, e.message));

  const cliente = `${pedido.Nombre || ''} ${pedido.Apellido || ''}`.trim() || null;
  await bitacoraService.registrar({
    tipo: 'pedido_estado',
    entidad: 'pedido_lucidsales',
    registroId: String(id),
    operadorId: t.usuarioId,
    cliente,
    valorAnterior: ESTADOS[anterior] || String(anterior),
    valorNuevo: ESTADOS[t.estadoNuevo],
    descripcion: `Cambio de estado masivo: ${ESTADOS[t.estadoNuevo]}`,
    detalle: { pedidoVinculadoId: id, estadoPedido: t.estadoNuevo, lote: t.id, masivo: true, ...(t.motivo ? { motivo: t.motivo } : {}) },
    tiendaId: t.tiendaId
  }).catch(e => console.warn('[CambioEstado] bitacora', id, e.message));
}

async function correr(t) {
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < t.ids.length) {
      const id = t.ids[siguiente++];
      try {
        await cambiarUno(id, t);
      } catch (e) {
        t.fallidos.push({ id, error: String(e.message || e).slice(0, 300) });
      } finally {
        t.procesados++;
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(EN_PARALELO, t.ids.length) }, trabajador));
  } finally {
    lucidsalesService.olvidarPedidos(t.ids);
    t.estado = 'terminado';
    t.fin = new Date().toISOString();
    setTimeout(() => trabajos.delete(t.id), GUARDAR_TRABAJO_MS).unref?.();
  }
}

function iniciar({ ids, estado, motivo, tiendaId, usuarioId, usuarioNombre }) {
  const lista = [...new Set((Array.isArray(ids) ? ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0))];
  if (!lista.length) throw errorUsuario('No hay pedidos seleccionados');
  if (lista.length > MAX_PEDIDOS) throw errorUsuario(`Máximo ${MAX_PEDIDOS} pedidos por vez (seleccionaste ${lista.length})`);
  const estadoNuevo = Number(estado);
  if (!Number.isInteger(estadoNuevo) || !(estadoNuevo in ESTADOS)) throw errorUsuario('Estado inválido');
  const motivoLimpio = typeof motivo === 'string' ? motivo.trim().slice(0, 500) : '';
  if (estadoNuevo === 1 && !motivoLimpio) throw errorUsuario('Al cancelar pedidos el motivo es obligatorio');

  for (const t of trabajos.values()) {
    if (t.estado === 'corriendo' && t.tiendaId === (tiendaId || null)) {
      throw errorUsuario('Ya hay un cambio de estado masivo en curso, espera a que termine', 409);
    }
  }

  const t = {
    id: crypto.randomUUID(),
    estado: 'corriendo',
    estadoNuevo,
    tiendaId: tiendaId || null,
    usuarioId: usuarioId || null,
    usuarioNombre: usuarioNombre || null,
    motivo: motivoLimpio || null,
    ids: lista,
    total: lista.length,
    procesados: 0,
    cambiados: 0,
    yaEstaban: 0,
    fallidos: [],
    inicio: new Date().toISOString(),
    fin: null
  };
  trabajos.set(t.id, t);
  correr(t).catch(e => console.error('[CambioEstado] lote', t.id, e));
  return vista(t);
}

function progreso(id, tiendaId) {
  const t = trabajos.get(String(id));
  if (!t || t.tiendaId !== (tiendaId || null)) throw errorUsuario('Cambio masivo no encontrado (puede haber expirado)', 404);
  return vista(t);
}

module.exports = { iniciar, progreso, ESTADOS, MAX_PEDIDOS };
