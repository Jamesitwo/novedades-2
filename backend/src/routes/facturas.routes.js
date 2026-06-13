const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove, getPdf } = require('../controllers/facturas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/:id/pdf', getPdf);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/estado', cambiarEstado);
router.delete('/:id', adminOnly, remove);

module.exports = router;
