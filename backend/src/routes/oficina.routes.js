const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, registrarIntento, remove, getVencimientos, exportarExcel, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta, toggleChat } = require('../controllers/oficina.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly, adminOOperadorAsignado } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, oficinaSchema, cambiarEstadoOficinaSchema, intentoSchema, bulkEstadoSchema, bulkAsignarSchema, bulkDeleteSchema, transferirSchema, chatSchema } = require('../middlewares/validate.middleware');
const { authorizeRecord } = require('../middlewares/authorize.middleware');

router.use(authMiddleware);

router.get('/', adminOOperadorAsignado, getAll);
router.get('/export', adminOOperadorAsignado, exportarExcel);
router.get('/vencimientos', adminOOperadorAsignado, getVencimientos);
router.get('/:id', adminOOperadorAsignado, validateParams(idParamSchema), getById);
router.post('/', adminOOperadorAsignado, validateBody(oficinaSchema), create);
router.put('/:id', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), validateBody(oficinaSchema.partial()), update);
router.patch('/bulk-estado', adminOnly, validateBody(bulkEstadoSchema), bulkCambiarEstado);
router.patch('/bulk-asignar', adminOnly, validateBody(bulkAsignarSchema), bulkAsignar);
router.delete('/bulk', adminOnly, validateBody(bulkDeleteSchema), bulkRemove);
router.patch('/:id/transferir', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), validateBody(transferirSchema), transferir);
router.patch('/:id/estado', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), validateBody(cambiarEstadoOficinaSchema), cambiarEstado);
router.patch('/:id/favorito', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), toggleFavorito);
router.patch('/:id/chat', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), validateBody(chatSchema), toggleChat);
router.post('/:id/duplicar', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), duplicar);
router.post('/:id/intento', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), validateBody(intentoSchema), registrarIntento);
router.post('/:id/etiquetas', adminOOperadorAsignado, validateParams(idParamSchema), authorizeRecord('oficina'), asignarEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', adminOOperadorAsignado, validateParams(idParamSchema.extend({ etiquetaId: idParamSchema.shape.id })), authorizeRecord('oficina'), removerEtiqueta);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;