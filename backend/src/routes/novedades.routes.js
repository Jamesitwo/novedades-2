const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove, exportarExcel, registrarIntento, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta, toggleChat } = require('../controllers/novedades.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly, adminOOperadorAsignado } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, novedadSchema, cambiarEstadoNovedadSchema, intentoSchema, bulkEstadoSchema, bulkAsignarSchema, bulkDeleteSchema, transferirSchema, chatSchema } = require('../middlewares/validate.middleware');
const { authorizeRecord } = require('../middlewares/authorize.middleware');

router.use(authMiddleware);

router.get('/', adminOOperadorAsignado, getAll);
router.get('/export', adminOOperadorAsignado, exportarExcel);
router.get('/:id', adminOOperadorAsignado, validateParams(idParamSchema), getById);
router.post('/', adminOOperadorAsignado, validateBody(novedadSchema), create);
router.put('/:id', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), validateBody(novedadSchema.partial()), update);
router.patch('/bulk-estado', adminOnly, validateBody(bulkEstadoSchema), bulkCambiarEstado);
router.patch('/bulk-asignar', adminOnly, validateBody(bulkAsignarSchema), bulkAsignar);
router.delete('/bulk', adminOnly, validateBody(bulkDeleteSchema), bulkRemove);
router.patch('/:id/transferir', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), validateBody(transferirSchema), transferir);
router.patch('/:id/estado', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), validateBody(cambiarEstadoNovedadSchema), cambiarEstado);
router.patch('/:id/favorito', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), toggleFavorito);
router.patch('/:id/chat', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), validateBody(chatSchema), toggleChat);
router.post('/:id/duplicar', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), duplicar);
router.post('/:id/intento', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), validateBody(intentoSchema), registrarIntento);
router.post('/:id/etiquetas', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('novedades'), asignarEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', adminOOperadorAsignado, validateParams(idParamSchema.extend({ etiquetaId: idParamSchema.shape.id })), authorizeRecord('novedades'), removerEtiqueta);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;