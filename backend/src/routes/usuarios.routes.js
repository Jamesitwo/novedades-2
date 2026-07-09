const express = require('express');
const router = express.Router();
const { getAll, create, update, remove, getOperadores } = require('../controllers/usuarios.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, usuarioSchema, usuarioUpdateSchema } = require('../middlewares/validate.middleware');

router.use(authMiddleware);

router.get('/operadores', getOperadores);
router.get('/', adminOnly, getAll);
router.post('/', adminOnly, validateBody(usuarioSchema), create);
router.put('/:id', adminOnly, validateParams(idParamSchema), validateBody(usuarioUpdateSchema), update);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;
