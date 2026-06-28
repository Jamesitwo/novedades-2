const express = require('express');
const router = express.Router();
const { getByProducto, create } = require('../controllers/resenas.controller');

router.get('/:productoId', getByProducto);
router.post('/:productoId', create);

module.exports = router;
