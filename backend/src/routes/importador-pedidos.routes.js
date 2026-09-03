const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/importador-pedidos.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { multiTiendaOnly } = require('../middlewares/multi-tienda.middleware');

router.use(authMiddleware);
router.use(multiTiendaOnly);

router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.updateConfig);
router.get('/lucidsales-pedidos', ctrl.listarLucidsalesPedidos);
router.post('/importar', ctrl.importar);
router.get('/importaciones', ctrl.importaciones);
router.post('/importaciones/:logId/reintentar', ctrl.reintentar);
router.delete('/importaciones/:logId', ctrl.desimportar);

module.exports = router;
