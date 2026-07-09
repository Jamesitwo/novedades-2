const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove } = require('../controllers/tareas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, tareaSchema } = require('../middlewares/validate.middleware');
const { z } = require('zod');

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', getAll);
router.get('/:id', validateParams(idParamSchema), getById);
router.post('/', validateBody(tareaSchema), create);
router.put('/:id', validateParams(idParamSchema), validateBody(tareaSchema.partial()), update);
router.patch('/:id/estado', validateParams(idParamSchema), validateBody(z.object({ estado: z.enum(['pendiente', 'en_progreso', 'revision', 'completada', 'cancelada']) })), cambiarEstado);
router.delete('/:id', validateParams(idParamSchema), remove);

module.exports = router;
