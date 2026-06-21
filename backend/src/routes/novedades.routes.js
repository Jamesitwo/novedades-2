const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove, exportarExcel, registrarIntento, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta } = require('../controllers/novedades.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly, adminOOperadorAsignado } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, novedadSchema, cambiarEstadoNovedadSchema, intentoSchema, bulkEstadoSchema, bulkAsignarSchema, bulkDeleteSchema, transferirSchema } = require('../middlewares/validate.middleware');

router.use(authMiddleware);

router.get('/', adminOOperadorAsignado, getAll);
router.get('/export', adminOOperadorAsignado, exportarExcel);
router.get('/:id', adminOOperadorAsignado, validateParams(idParamSchema), getById);
router.post('/', adminOOperadorAsignado, validateBody(novedadSchema), create);
router.put('/:id', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(novedadSchema.partial()), update);
router.patch('/bulk-estado', adminOnly, validateBody(bulkEstadoSchema), bulkCambiarEstado);
router.patch('/bulk-asignar', adminOnly, validateBody(bulkAsignarSchema), bulkAsignar);
router.delete('/bulk', adminOnly, validateBody(bulkDeleteSchema), bulkRemove);
router.patch('/:id/transferir', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(transferirSchema), transferir);
router.patch('/:id/estado', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(cambiarEstadoNovedadSchema), cambiarEstado);
router.patch('/:id/favorito', adminOOperadorAsignado, validateParams(idParamSchema), toggleFavorito);
router.post('/:id/duplicar', adminOOperadorAsignado, validateParams(idParamSchema), duplicar);
router.post('/:id/intento', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(intentoSchema), registrarIntento);
router.post('/:id/etiquetas', adminOOperadorAsignado, validateParams(idParamSchema), asignarEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', adminOOperadorAsignado, validateParams(idParamSchema.extend({ etiquetaId: idParamSchema.shape.id })), removerEtiqueta);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;