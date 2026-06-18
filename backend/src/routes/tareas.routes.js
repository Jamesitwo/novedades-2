const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove } = require('../controllers/tareas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/estado', cambiarEstado);
router.delete('/:id', remove);

module.exports = router;
