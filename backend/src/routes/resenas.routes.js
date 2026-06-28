const express = require('express');
const router = express.Router();
const { getByProducto, create, generarAleatorias } = require('../controllers/resenas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.get('/:productoId', getByProducto);

router.use(authMiddleware);
router.post('/:productoId', adminOnly, create);
router.post('/:productoId/generar', adminOnly, generarAleatorias);

module.exports = router;
