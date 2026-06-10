const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove, exportarExcel, registrarIntento, bulkCambiarEstado, bulkAsignar, transferir, toggleFavorito, duplicar, asignarEtiqueta, removerEtiqueta } = require('../controllers/novedades.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly, adminOOperadorAsignado } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/', adminOOperadorAsignado, getAll);
router.get('/export', adminOOperadorAsignado, exportarExcel);
router.get('/:id', adminOOperadorAsignado, getById);
router.post('/', adminOOperadorAsignado, create);
router.put('/:id', adminOOperadorAsignado, update);
router.patch('/bulk-estado', adminOnly, bulkCambiarEstado);
router.patch('/bulk-asignar', adminOnly, bulkAsignar);
router.patch('/:id/transferir', adminOOperadorAsignado, transferir);
router.patch('/:id/estado', adminOOperadorAsignado, cambiarEstado);
router.patch('/:id/favorito', adminOOperadorAsignado, toggleFavorito);
router.post('/:id/duplicar', adminOOperadorAsignado, duplicar);
router.post('/:id/intento', adminOOperadorAsignado, registrarIntento);
router.post('/:id/etiquetas', adminOOperadorAsignado, asignarEtiqueta);
router.delete('/:id/etiquetas/:etiquetaId', adminOOperadorAsignado, removerEtiqueta);
router.delete('/:id', adminOnly, remove);

module.exports = router;