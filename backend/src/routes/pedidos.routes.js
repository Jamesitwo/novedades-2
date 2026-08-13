const express = require('express');
const router = express.Router();
const { getAll, getById, updateEstado, remove, cotizarDropi, confirmarDropi } = require('../controllers/pedidos.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/', adminOnly, getAll);
router.get('/:id', adminOnly, getById);
router.put('/:id', adminOnly, updateEstado);
router.delete('/:id', adminOnly, remove);
router.post('/:id/cotizar-dropi', adminOnly, cotizarDropi);
router.post('/:id/confirmar-dropi', adminOnly, confirmarDropi);

module.exports = router;
