const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsapp.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');
const { validateBody, validateParams, idParamSchema } = require('../middlewares/validate.middleware');
const { z } = require('zod');

const sendSchema = z.object({
  tabla: z.enum(['pedidos_novedad', 'pedidos_oficina']),
  registroId: z.string().uuid(),
  tipo: z.enum(['texto', 'plantilla', 'image', 'video', 'audio', 'document']),
  contenido: z.string().optional().nullable(),
  plantillaNombre: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  caption: z.string().optional().nullable()
});

const readSchema = z.object({
  tabla: z.enum(['pedidos_novedad', 'pedidos_oficina']),
  registroId: z.string().uuid()
});

const tablaParamSchema = z.object({
  tabla: z.enum(['pedidos_novedad', 'pedidos_oficina']),
  id: z.string().uuid()
});

router.post('/enviar', authMiddleware, validateBody(sendSchema), ctrl.sendMessage);
router.get('/:tabla/:id/mensajes', authMiddleware, validateParams(tablaParamSchema), ctrl.getConversation);
router.patch('/leer', authMiddleware, validateBody(readSchema), ctrl.markMessagesAsRead);
router.get('/plantillas', authMiddleware, ctrl.getTemplates);
router.post('/plantillas/sync', authMiddleware, adminOnly, ctrl.syncTemplates);
router.patch('/plantillas/:id', authMiddleware, adminOnly, ctrl.updateTemplate);
router.get('/:tabla/:id/status', authMiddleware, validateParams(tablaParamSchema), ctrl.getRecordStatus);

module.exports = router;
