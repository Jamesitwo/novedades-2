const { prisma } = require('../prisma/client');
const wpService = require('../services/whatsapp.service');
const wsService = require('../services/websocket.service');

const webhookVerify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === wpService.VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp] Webhook verification failed');
  return res.sendStatus(403);
};

const webhookReceive = async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

  if (!wpService.verifyWebhookSignature(signature, rawBody)) {
    console.warn('[WhatsApp] Invalid webhook signature');
    return res.sendStatus(403);
  }

  try {
    const entry = req.body?.entry?.[0];
    if (entry) {
      await wpService.processIncomingMessage(entry);
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      if (value?.messages?.[0]) {
        const msg = value.messages[0];
        const from = msg.from;
        wsService.whatsappMensajeRecibido('pedidos_novedad', null, { from, timestamp: msg.timestamp });
      }
    }
  } catch (error) {
    console.error('[WhatsApp] Webhook processing error:', error.message);
  }

  res.sendStatus(200);
};

const sendMessage = async (req, res) => {
  try {
    const { tabla, registroId, tipo, contenido, plantillaNombre, mediaUrl, caption } = req.body;

    if (!tabla || !registroId) {
      return res.status(400).json({ error: 'tabla y registroId son requeridos' });
    }

    const model = tabla === 'pedidos_novedad' ? 'pedidoNovedad' : 'pedidoOficina';
    const record = await prisma[model].findUnique({ where: { id: registroId } });

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    if (record.optOutWhatsapp) {
      return res.status(400).json({ error: 'El cliente optó por no recibir mensajes' });
    }

    const celular = record.whatsappThreadId || record.celular;
    if (!celular) {
      return res.status(400).json({ error: 'No hay número de celular ni hilo de WhatsApp' });
    }

    const ventanaActiva = wpService.check24hWindow(record);

    let response;

    if (tipo === 'texto') {
      if (!ventanaActiva) {
        return res.status(400).json({
          error: 'La ventana de 24 horas está cerrada. Solo se permiten plantillas aprobadas.',
          ventanaActiva: false
        });
      }
      response = await wpService.sendTextMessage(celular, contenido);
    } else if (tipo === 'plantilla') {
      if (!plantillaNombre) {
        return res.status(400).json({ error: 'plantillaNombre es requerido para tipo plantilla' });
      }
      const plantilla = await prisma.plantillaWhatsApp.findUnique({ where: { nombre: plantillaNombre } });
      if (!plantilla) {
        return res.status(400).json({ error: 'Plantilla no encontrada en BD' });
      }
      response = await wpService.sendTemplateMessage(celular, plantillaNombre, plantilla.idioma);
    } else if (tipo === 'media') {
      if (!mediaUrl) {
        return res.status(400).json({ error: 'mediaUrl es requerido para tipo media' });
      }
      response = await wpService.sendMediaMessage(celular, tipo, mediaUrl, caption);
    } else {
      return res.status(400).json({ error: 'tipo inválido. Usar: texto, plantilla, image, video, audio, document' });
    }

    const whatsappMsgId = response?.messages?.[0]?.id;

    const mensaje = await wpService.saveSentMessage(
      tabla,
      registroId,
      ['image', 'video', 'audio', 'document'].includes(tipo) ? tipo : (tipo === 'plantilla' ? 'plantilla' : 'texto'),
      contenido,
      plantillaNombre || null,
      whatsappMsgId || null,
      req.usuario.id
    );

    if (tabla && registroId) {
      wsService.whatsappMensajeEnviado(tabla, registroId, mensaje, req.usuario?.id);
    }

    return res.json({
      success: true,
      mensaje,
      ventanaActiva,
      whatsappResponse: response
    });
  } catch (error) {
    console.error('[WhatsApp] Send message error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error?.message || error.message || 'Error al enviar mensaje';
    return res.status(status).json({ error: message });
  }
};

const getConversation = async (req, res) => {
  try {
    const { tabla, id } = req.params;
    const { limit } = req.query;

    const model = tabla === 'pedidos_novedad' ? 'pedidoNovedad' : 'pedidoOficina';
    const record = await prisma[model].findUnique({
      where: { id },
      select: {
        id: true,
        celular: true,
        chatActivo: true,
        fechaUltimoMsjCliente: true,
        whatsappThreadId: true,
        optOutWhatsapp: true
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    await wpService.autoExpireChatWindow(tabla, id);

    if (!record.chatActivo) {
      const updated = await prisma[model].findUnique({
        where: { id },
        select: { chatActivo: true }
      });
      record.chatActivo = updated.chatActivo;
    }

    const mensajes = await wpService.getConversationMessages(tabla, id, parseInt(limit) || 100);

    const noLeidos = await wpService.getUnreadCount(tabla, id);

    const ventanaActiva = record.chatActivo && wpService.check24hWindow(record);
    const tiempoRestante = wpService.get24hRemaining(record);

    return res.json({
      record: {
        id: record.id,
        celular: record.celular,
        chatActivo: ventanaActiva,
        optOutWhatsapp: record.optOutWhatsapp,
        tiempoRestante
      },
      mensajes: mensajes.reverse(),
      noLeidos,
      ventanaActiva
    });
  } catch (error) {
    console.error('[WhatsApp] Get conversation error:', error.message);
    return res.status(500).json({ error: 'Error al obtener conversación' });
  }
};

const markMessagesAsRead = async (req, res) => {
  try {
    const { tabla, registroId } = req.body;

    if (!tabla || !registroId) {
      return res.status(400).json({ error: 'tabla y registroId son requeridos' });
    }

    await wpService.markAsRead(tabla, registroId);

    return res.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp] Mark read error:', error.message);
    return res.status(500).json({ error: 'Error al marcar como leídos' });
  }
};

const getTemplates = async (req, res) => {
  try {
    const templates = await prisma.plantillaWhatsApp.findMany({
      where: { activa: true },
      orderBy: { nombre: 'asc' }
    });

    return res.json(templates);
  } catch (error) {
    console.error('[WhatsApp] Get templates error:', error.message);
    return res.status(500).json({ error: 'Error al obtener plantillas' });
  }
};

const syncTemplates = async (req, res) => {
  try {
    const resultado = await wpService.syncTemplates();
    return res.json({
      success: true,
      count: resultado.length,
      templates: resultado
    });
  } catch (error) {
    console.error('[WhatsApp] Sync templates error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Error al sincronizar plantillas con Meta' });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { activa } = req.body;

    const template = await prisma.plantillaWhatsApp.update({
      where: { id },
      data: { activa }
    });

    return res.json(template);
  } catch (error) {
    console.error('[WhatsApp] Update template error:', error.message);
    return res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
};

const getRecordStatus = async (req, res) => {
  try {
    const { tabla, id } = req.params;

    const model = tabla === 'pedidos_novedad' ? 'pedidoNovedad' : 'pedidoOficina';
    const record = await prisma[model].findUnique({
      where: { id },
      select: {
        id: true,
        celular: true,
        chatActivo: true,
        fechaUltimoMsjCliente: true,
        optOutWhatsapp: true,
        whatsappThreadId: true
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    await wpService.autoExpireChatWindow(tabla, id);

    const updated = await prisma[model].findUnique({
      where: { id },
      select: { chatActivo: true }
    });

    const ventanaActiva = updated.chatActivo && wpService.check24hWindow(record);
    const tiempoRestante = wpService.get24hRemaining(record);

    return res.json({
      chatActivo: ventanaActiva,
      optOutWhatsapp: record.optOutWhatsapp,
      tiempoRestante,
      tieneConversacion: !!record.whatsappThreadId
    });
  } catch (error) {
    console.error('[WhatsApp] Record status error:', error.message);
    return res.status(500).json({ error: 'Error al obtener estado' });
  }
};

module.exports = {
  webhookVerify,
  webhookReceive,
  sendMessage,
  getConversation,
  markMessagesAsRead,
  getTemplates,
  syncTemplates,
  updateTemplate,
  getRecordStatus
};
