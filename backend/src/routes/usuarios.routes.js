const express = require('express');
const router = express.Router();
const { getAll, create, update, remove, getOperadores } = require('../controllers/usuarios.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/operadores', getOperadores);
router.get('/', adminOnly, getAll);
router.post('/', adminOnly, create);
router.put('/:id', adminOnly, update);
router.delete('/:id', adminOnly, remove);

module.exports = router;