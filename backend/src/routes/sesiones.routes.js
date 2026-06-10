const express = require('express');
const router = express.Router();
const { getAll, deleteSesion, deleteAllForUsuario, heartbeat } = require('../controllers/sesiones.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.post('/heartbeat', heartbeat);
router.get('/', adminOnly, getAll);
router.delete('/:id', adminOnly, deleteSesion);
router.delete('/usuario/:usuarioId', adminOnly, deleteAllForUsuario);

module.exports = router;