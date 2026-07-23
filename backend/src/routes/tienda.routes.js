const express = require('express');
const router = express.Router();
const { getAll, getDestacados, getOfertas, getById, create, update, remove, toggleActivo, procesarCompra } = require('../controllers/tienda.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.get('/', getAll);
router.get('/destacados', getDestacados);
router.get('/ofertas', getOfertas);
router.post('/comprar', procesarCompra);
router.get('/:id', getById);

router.use(authMiddleware);
router.post('/', adminOnly, create);
router.put('/:id', adminOnly, update);
router.delete('/:id', adminOnly, remove);
router.patch('/:id/toggle', adminOnly, toggleActivo);

module.exports = router;
