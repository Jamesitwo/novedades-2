// /api/motor-dropi/* -> motor de subida a Dropi (subida automatica, agente,
// entregas programadas, sesion de Dropi, IA, Lucid Bot, Google Maps).
// El usuario ya viene autenticado por Pizdo; el motor aplica los permisos
// (subir/validar: operadores de pedidos; ajustes: solo admin).
const router = require('express').Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const motor = require('../services/motor-dropi');

router.use(authMiddleware);

// el panel pregunta aqui si muestra lo del motor (apagado salvo MOTOR_DROPI=1)
router.get('/_estado', (req, res) => res.json({ ok: true, ...motor.estado() }));

// lo que los paneles del motor necesitan saber de la sesion de Pizdo
router.get('/_sesion', async (req, res) => {
  try {
    const tiendas = await motor.tiendasConLucid();
    const t = tiendas.find((x) => x.id === req.tiendaId) || null;
    res.json({
      ok: true,
      tienda: t ? { id: t.id, slug: t.slug, nombre: t.nombre, shopId: t.shopId } : null,
      usuario: { id: req.usuario.id, nombre: req.usuario.nombre, email: req.usuario.email, rol: req.usuario.rol },
      esAdmin: req.usuario.rol === 'admin'
    });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  }
});

router.use(async (req, res) => {
  try {
    await motor.atender(req, res);
  } catch (e) {
    console.error('[motor-dropi] error atendiendo', req.method, req.originalUrl, e);
    if (!res.headersSent) res.status(500).json({ ok: false, msg: e.message || 'Error del motor de subida' });
  }
});

module.exports = router;
