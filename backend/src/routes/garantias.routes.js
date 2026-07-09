const express = require('express');
const router = express.Router();
const { getAll, getById, checkToken, create, registrar, cambiarEstado, remove } = require('../controllers/garantias.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, garantiaSchema, garantiaRegistroSchema } = require('../middlewares/validate.middleware');
const { z } = require('zod');

router.get('/check/:token', checkToken);
router.post('/registro/:token', validateBody(garantiaRegistroSchema), registrar);

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', validateParams(idParamSchema), getById);
router.post('/', validateBody(garantiaSchema), create);
router.patch('/:id/estado', validateParams(idParamSchema), validateBody(z.object({ estado: z.string().min(1) })), cambiarEstado);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;
