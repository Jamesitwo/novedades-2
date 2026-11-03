// /api/zunto/* -> motor de ZuntoStore (subida automatica a Dropi, agente,
// entregas programadas, sesion de Dropi, IA, Lucid Bot, Google Maps).
// El usuario ya viene autenticado por Pizdo; el motor aplica los permisos
// (subir/validar: operadores de pedidos; ajustes: solo admin).
const router = require('express').Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const zunto = require('../services/zunto');

router.use(authMiddleware);

router.get('/_estado', (req, res) => res.json({ ok: true, ...zunto.estado() }));

// lo que los paneles de Zunto necesitan saber de la sesion de Pizdo
router.get('/_sesion', async (req, res) => {
  try {
    const tiendas = await zunto.tiendasConLucid();
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
    await zunto.atender(req, res);
  } catch (e) {
    console.error('[zunto] error atendiendo', req.method, req.originalUrl, e);
    if (!res.headersSent) res.status(500).json({ ok: false, msg: e.message || 'Error del motor de subida' });
  }
});

module.exports = router;
