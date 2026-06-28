const router = require('express').Router();
const ctrl = require('../controllers/lucidsales.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/pedidos', ctrl.getPedidos);
router.post('/pedidos/cotizar', ctrl.cotizarEnvio);
router.post('/pedidos/subir-dropi', ctrl.subirADropi);
router.post('/pedidos/validate-address', ctrl.validateAddress);
router.post('/pedidos', ctrl.createPedido);
router.get('/pedidos/:id', ctrl.getPedidoById);
router.put('/pedidos/:id', ctrl.updatePedido);
router.post('/productos', ctrl.getProductos);
router.get('/filters-data', ctrl.getFiltersData);

router.get('/paises', ctrl.getPaises);
router.get('/departamentos', ctrl.getDepartamentos);
router.get('/ciudades', ctrl.getCiudades);
router.get('/ciudades-locales', ctrl.getCiudadesLocales);
router.get('/departamentos-locales', ctrl.getDepartamentosLocales);

router.get('/verificar-conexion', ctrl.verificarConexion);

router.post('/vincular', ctrl.vincularPedido);
router.get('/vinculados', ctrl.listarVinculados);

module.exports = router;
