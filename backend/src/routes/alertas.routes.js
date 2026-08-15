const express = require('express');
const router = express.Router();
const { getByProducto, getAll, getByPedido, create, update, remove } = require('../controllers/alertas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res, next) => {
  if (req.query.productoId) return getByProducto(req, res, next);
  return getAll(req, res, next);
});
router.get('/pedido/:lucidsalesPedidoId', getByPedido);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
