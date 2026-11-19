// Cambio de estado masivo de pedidos de LucidSales (solo admin).
const servicio = require('../services/cambio-estado-masivo.service');

function responderError(res, e, accion) {
  if (e.status && e.status < 500) return res.status(e.status).json({ error: e.message });
  console.error(`[CambioEstado] ${accion}:`, e);
  res.status(500).json({ error: e.message || `Error al ${accion}` });
}

const iniciar = (req, res) => {
  try {
    const { ids, estado, motivo } = req.body || {};
    const trabajo = servicio.iniciar({
      ids, estado, motivo,
      tiendaId: req.tiendaId,
      usuarioId: req.usuario?.id,
      usuarioNombre: req.usuario?.nombre || req.usuario?.email
    });
    res.status(202).json({ ok: true, trabajo });
  } catch (e) {
    responderError(res, e, 'iniciar el cambio de estado');
  }
};

const progreso = (req, res) => {
  try {
    res.json({ ok: true, trabajo: servicio.progreso(req.params.id, req.tiendaId) });
  } catch (e) {
    responderError(res, e, 'consultar el cambio de estado');
  }
};

module.exports = { iniciar, progreso };
