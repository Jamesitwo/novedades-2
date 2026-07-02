const router = require('express').Router();
const ctrl = require('../controllers/lucidsales.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/pedidos', ctrl.getPedidos);
router.post('/pedidos/cotizar', ctrl.cotizarEnvio);
router.post('/pedidos/confirmar-envio', ctrl.confirmarEnvio);
router.post('/pedidos/validate-address', ctrl.validateAddress);
router.post('/pedidos/validar-direccion', ctrl.validarDireccion);
router.post('/pedidos', ctrl.createPedido);
router.get('/pedidos/:id', ctrl.getPedidoById);
router.post('/pedidos/:id', ctrl.updatePedido);
router.post('/pedidos/:id/duplicar', ctrl.duplicarPedido);
router.post('/pedidos/:id/subir-dividido', ctrl.subirDividido);
router.post('/productos', ctrl.getProductos);
router.get('/filters-data', ctrl.getFiltersData);

router.get('/paises', ctrl.getPaises);
router.get('/departamentos', ctrl.getDepartamentos);
router.get('/ciudades', ctrl.getCiudades);
router.get('/ciudades-locales', ctrl.getCiudadesLocales);
router.get('/departamentos-locales', ctrl.getDepartamentosLocales);

router.get('/verificar-conexion', ctrl.verificarConexion);

router.post('/vincular', ctrl.vincularPedido);
router.post('/vincular-y-actualizar', ctrl.vincularYActualizar);
router.post('/guardar-local', ctrl.guardarLocal);
router.post('/interrapidisimo/oficinas', ctrl.buscarOficinaIR);
router.get('/vinculados', ctrl.listarVinculados);
router.get('/vinculados/:id/etiquetas', ctrl.getEtiquetas);
router.post('/vinculados/:id/etiquetas', ctrl.asignarEtiqueta);
router.delete('/vinculados/:id/etiquetas/:etiquetaId', ctrl.removerEtiqueta);

module.exports = router;
