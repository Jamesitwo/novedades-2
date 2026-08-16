const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/perfumes.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);
router.use(adminOnly);

router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.updateConfig);
router.get('/lucidsales-productos', ctrl.listarLucidsalesProductos);
router.post('/importar', ctrl.importar);
router.get('/importaciones', ctrl.importaciones);
router.post('/importaciones/:logId/reintentar', ctrl.reintentar);
router.get('/productos', ctrl.listarProductosLocales);

module.exports = router;
