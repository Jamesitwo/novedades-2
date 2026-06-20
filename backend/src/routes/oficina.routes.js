const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, registrarIntento, remove, getVencimientos, exportarExcel, bulkCambiarEstado, bulkAsignar, bulkRemove, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta } = require('../controllers/oficina.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly, adminOOperadorAsignado } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, oficinaSchema, cambiarEstadoOficinaSchema, intentoSchema, bulkEstadoSchema, bulkAsignarSchema, transferirSchema } = require('../middlewares/validate.middleware');

router.use(authMiddleware);

router.get('/', adminOOperadorAsignado, getAll);
router.get('/export', adminOOperadorAsignado, exportarExcel);
router.get('/vencimientos', adminOOperadorAsignado, getVencimientos);
router.get('/:id', adminOOperadorAsignado, validateParams(idParamSchema), getById);
router.post('/', adminOOperadorAsignado, validateBody(oficinaSchema), create);
router.put('/:id', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(oficinaSchema.partial()), update);
router.patch('/bulk-estado', adminOnly, validateBody(bulkEstadoSchema), bulkCambiarEstado);
router.patch('/bulk-asignar', adminOnly, validateBody(bulkAsignarSchema), bulkAsignar);
router.delete('/bulk', adminOnly, bulkRemove);
router.patch('/:id/transferir', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(transferirSchema), transferir);
router.patch('/:id/estado', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(cambiarEstadoOficinaSchema), cambiarEstado);
router.patch('/:id/favorito', adminOOperadorAsignado, validateParams(idParamSchema), toggleFavorito);
router.post('/:id/duplicar', adminOOperadorAsignado, validateParams(idParamSchema), duplicar);
router.post('/:id/intento', adminOOperadorAsignado, validateParams(idParamSchema), validateBody(intentoSchema), registrarIntento);
router.post('/:id/etiquetas', adminOOperadorAsignado, validateParams(idParamSchema), asignarEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', adminOOperadorAsignado, validateParams(idParamSchema.extend({ etiquetaId: idParamSchema.shape.id })), removerEtiqueta);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;