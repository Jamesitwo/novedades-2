const express = require('express');
const router = express.Router();
const { getResumen, getHoy, getChartData, getRendimientoOperadores, getMetricasOperadores, getTiempoActivo, getResumenDiario, getMetricasLucidsales, getPedidosSubidos } = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/resumen', getResumen);
router.get('/hoy', getHoy);
router.get('/chart', getChartData);
router.get('/rendimiento', getRendimientoOperadores);
router.get('/metricas-operadores', adminOnly, getMetricasOperadores);
router.get('/tiempo-activo', adminOnly, getTiempoActivo);
router.get('/resumen-diario', adminOnly, getResumenDiario);
router.get('/metricas-lucidsales', adminOnly, getMetricasLucidsales);
router.get('/pedidos-subidos', getPedidosSubidos);

module.exports = router;