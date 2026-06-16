const express = require('express');
const router = express.Router();
const { getAll, getById, checkToken, create, registrar, cambiarEstado, remove } = require('../controllers/garantias.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.get('/check/:token', checkToken);
router.post('/registro/:token', registrar);

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.patch('/:id/estado', cambiarEstado);
router.delete('/:id', adminOnly, remove);

module.exports = router;
