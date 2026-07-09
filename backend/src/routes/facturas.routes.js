const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, cambiarEstado, remove, getPdf } = require('../controllers/facturas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema, facturaSchema } = require('../middlewares/validate.middleware');
const { z } = require('zod');

router.use(authMiddleware);

router.get('/', getAll);
router.get('/:id', validateParams(idParamSchema), getById);
router.get('/:id/pdf', validateParams(idParamSchema), getPdf);
router.post('/', validateBody(facturaSchema), create);
router.put('/:id', validateParams(idParamSchema), validateBody(facturaSchema.partial()), update);
router.patch('/:id/estado', validateParams(idParamSchema), validateBody(z.object({ estado: z.enum(['pendiente', 'pagada', 'anulada']) })), cambiarEstado);
router.delete('/:id', adminOnly, validateParams(idParamSchema), remove);

module.exports = router;
