const express = require('express');
const router = express.Router();
const { getHistorial, exportarHistorial } = require('../controllers/historial.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly, adminOOperadorAsignado } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/export', adminOnly, exportarHistorial);
router.get('/:tabla/:id', adminOOperadorAsignado, getHistorial);

module.exports = router;