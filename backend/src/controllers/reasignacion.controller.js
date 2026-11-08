// Reasignacion masiva de pedidos de LucidSales (solo admin).
const reasignacion = require('../services/reasignacion.service');

function parametros(req) {
  const b = req.body || {};
  const lista = v => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  const estados = Array.isArray(b.estados) ? b.estados.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 9) : null;
  const fecha = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    tiendaId: req.tiendaId || null,
    origenIds: [...new Set(lista(b.origenIds))],
    destinoIds: [...new Set(lista(b.destinoIds))],
    modo: String(b.modo || ''),
    estados,
    fechaDesde: fecha(b.fechaDesde),
    fechaHasta: fecha(b.fechaHasta)
  };
}

function responderError(res, e, accion) {
  if (e.status && e.status < 500) return res.status(e.status).json({ error: e.message });
  console.error(`[Reasignacion] ${accion}:`, e);
  res.status(500).json({ error: e.message || `Error al ${accion}` });
}

const operadores = async (req, res) => {
  try {
    res.json({ ok: true, operadores: await reasignacion.operadoresConCarga(req.tiendaId) });
  } catch (e) {
    responderError(res, e, 'cargar operadores');
  }
};

const previsualizar = async (req, res) => {
  try {
    res.json({ ok: true, ...(await reasignacion.previsualizar(parametros(req))) });
  } catch (e) {
    responderError(res, e, 'calcular la reasignación');
  }
};

const ejecutar = async (req, res) => {
  try {
    const p = parametros(req);
    // lo que el admin vio en la vista previa: si cambio mucho, se avisa
    const esperado = Number(req.body?.esperado);
    const r = await reasignacion.ejecutar(p, req.usuario);
    res.json({ ok: true, ...r, ...(Number.isFinite(esperado) && esperado !== r.total ? { aviso: `La vista previa decía ${esperado} y se movieron ${r.total} (los pedidos cambiaron entre tanto)` } : {}) });
  } catch (e) {
    responderError(res, e, 'reasignar');
  }
};

const lotes = async (req, res) => {
  try {
    res.json({ ok: true, lotes: await reasignacion.lotes(req.tiendaId) });
  } catch (e) {
    responderError(res, e, 'cargar el historial');
  }
};

const deshacer = async (req, res) => {
  try {
    res.json({ ok: true, ...(await reasignacion.deshacer(String(req.params.lote), req.usuario, req.tiendaId)) });
  } catch (e) {
    responderError(res, e, 'deshacer');
  }
};

module.exports = { operadores, previsualizar, ejecutar, lotes, deshacer };
