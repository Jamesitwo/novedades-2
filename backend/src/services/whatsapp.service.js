const crypto = require('crypto');
const { prisma } = require('../prisma/client');

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

const GRAPH_API_BASE = `https://graph.facebook.com/${API_VERSION}`;
const FETCH_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  } catch {
    return fetch(url, options);
  }
}

async function graphPost(path, body) {
  const url = `${GRAPH_API_BASE}${path}`;
  const resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data?.error?.message || `HTTP ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function graphGet(path) {
  const url = `${GRAPH_API_BASE}${path}`;
  const resp = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data?.error?.message || `HTTP ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 55;

async function rateLimited(execute) {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
  let attempt = 0;
  while (attempt < 3) {
    try {
      return await execute();
    } catch (error) {
      if (error.status === 429 && attempt < 2) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error('WhatsApp API: agotados todos los reintentos');
}

function validateWhatsAppConfig() {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN son requeridos');
  }
}

function check24hWindow(record) {
  if (!record?.fechaUltimoMsjCliente) return false;
  return Date.now() - new Date(record.fechaUltimoMsjCliente).getTime() < 24 * 3600000;
}

function get24hRemaining(record) {
  if (!record?.fechaUltimoMsjCliente) return null;
  const remaining = 24 * 3600000 - (Date.now() - new Date(record.fechaUltimoMsjCliente).getTime());
  return remaining > 0 ? remaining : 0;
}

function verifyWebhookSignature(signature, body) {
  if (!APP_SECRET) {
    console.error('[WhatsApp] APP_SECRET no configurado. Webhooks seran rechazados por seguridad.');
    return false;
  }
  if (!signature) return false;
  const expected = signature.replace('sha256=', '');
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(payload);
  const calculated = hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(calculated));
  } catch {
    return false;
  }
}

async function sendTextMessage(to, text) {
  validateWhatsAppConfig();
  return rateLimited(() => graphPost(`/${PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text }
  }));
}

async function sendTemplateMessage(to, templateName, language = 'es', components = []) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language }
    }
  };
  if (components?.length) {
    payload.template.components = components;
  }
  return rateLimited(() => graphPost(`/${PHONE_NUMBER_ID}/messages`, payload));
}

async function sendMediaMessage(to, mediaType, mediaUrl, caption = null) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: mediaType,
    [mediaType]: { link: mediaUrl }
  };
  if (caption) {
    payload[mediaType].caption = caption;
  }
  return rateLimited(() => graphPost(`/${PHONE_NUMBER_ID}/messages`, payload));
}

async function getTemplatesFromMeta() {
  if (!WABA_ID) throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID not configured');
  const data = await graphGet(`/${WABA_ID}/message_templates`);
  return (data.data || []).map(t => ({
    nombre: t.name,
    categoria: t.category,
    idioma: t.language,
    estado: t.status,
    componentes: t.components || []
  }));
}

async function syncTemplates() {
  const metaTemplates = await getTemplatesFromMeta();
  for (const t of metaTemplates) {
    await prisma.plantillaWhatsApp.upsert({
      where: { nombre: t.nombre },
      create: {
        nombre: t.nombre,
        categoria: t.categoria,
        idioma: t.idioma,
        estado: t.estado
      },
      update: {
        categoria: t.categoria,
        idioma: t.idioma,
        estado: t.estado
      }
    });
  }
  return metaTemplates;
}

async function findRecordByPhone(celular) {
  const limpio = celular.replace(/[\s+\-\(\)]/g, '');
  const novedad = await prisma.pedidoNovedad.findFirst({
    where: {
      OR: [
        { celular: { endsWith: limpio.slice(-8) } },
        { celular2: { endsWith: limpio.slice(-8) } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  if (novedad) return { record: novedad, tabla: 'pedidos_novedad' };

  const oficina = await prisma.pedidoOficina.findFirst({
    where: {
      OR: [
        { celular: { endsWith: limpio.slice(-8) } },
        { celular2: { endsWith: limpio.slice(-8) } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
  if (oficina) return { record: oficina, tabla: 'pedidos_oficina' };

  return null;
}

const OPT_OUT_KEYWORDS = ['stop', 'baja', 'cancelar', 'no molestar', 'no quiero', 'no quiero mas', 'basta', 'parar'];

function checkOptOut(text) {
  const lower = (text || '').toLowerCase().trim();
  return OPT_OUT_KEYWORDS.includes(lower) || OPT_OUT_KEYWORDS.some(k => lower === k || lower.split(' ')[0] === k);
}

async function processIncomingMessage(entry) {
  try {
    const value = entry?.changes?.[0]?.value;
    if (!value?.messages?.length) return;

    for (const msg of value.messages) {
      const waId = msg.from;
      const matched = await findRecordByPhone(waId);

      let tabla = 'desconocido';
      let registroId = null;

      if (matched) {
        tabla = matched.tabla;
        registroId = matched.record.id;
        const model = tabla === 'pedidos_novedad' ? 'pedidoNovedad' : 'pedidoOficina';
        await prisma[model].update({
          where: { id: matched.record.id },
          data: {
            fechaUltimoMsjCliente: new Date(),
            chatActivo: true,
            whatsappThreadId: matched.record.whatsappThreadId || waId
          }
        });
      }

      const tipo = msg.type || 'text';
      const contenido = tipo === 'text' ? msg.text?.body : null;

      await prisma.mensajeWhatsApp.create({
        data: {
          tabla,
          registroId: registroId || waId,
          direccion: 'entrante',
          tipo,
          contenido,
          whatsappMsgId: msg.id,
          estado: 'entregado',
          metadata: msg,
          leido: false
        }
      });

      if (contenido && checkOptOut(contenido) && matched) {
        const model = matched.tabla === 'pedidos_novedad' ? 'pedidoNovedad' : 'pedidoOficina';
        await prisma[model].update({
          where: { id: matched.record.id },
          data: { optOutWhatsapp: true, chatActivo: false }
        });
      }
    }
  } catch (error) {
    console.error('[WhatsApp] Process error:', error.message);
  }
}

async function saveSentMessage(tabla, registroId, tipo, contenido, plantillaNombre, whatsappMsgId, usuarioId) {
  return prisma.mensajeWhatsApp.create({
    data: {
      tabla,
      registroId,
      direccion: 'saliente',
      tipo,
      contenido,
      plantillaNombre: plantillaNombre || null,
      whatsappMsgId: whatsappMsgId || null,
      estado: 'enviado',
      usuarioId,
      leido: true
    }
  });
}

async function getConversationMessages(tabla, registroId, limit = 100) {
  return prisma.mensajeWhatsApp.findMany({
    where: { tabla, registroId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { usuario: { select: { id: true, nombre: true } } }
  });
}

async function getUnreadCount(tabla, registroId) {
  return prisma.mensajeWhatsApp.count({
    where: { tabla, registroId, direccion: 'entrante', leido: false }
  });
}

async function markAsRead(tabla, registroId) {
  return prisma.mensajeWhatsApp.updateMany({
    where: { tabla, registroId, direccion: 'entrante', leido: false },
    data: { leido: true }
  });
}

async function updateMessageStatus(whatsappMsgId, newStatus) {
  return prisma.mensajeWhatsApp.updateMany({
    where: { whatsappMsgId },
    data: { estado: newStatus }
  });
}

async function autoExpireChatWindow(tabla, registroId) {
  const model = tabla === 'pedidos_novedad' ? 'pedidoNovedad' : 'pedidoOficina';
  const record = await prisma[model].findUnique({ where: { id: registroId } });
  if (record?.chatActivo && !check24hWindow(record)) {
    await prisma[model].update({
      where: { id: registroId },
      data: { chatActivo: false }
    });
    return true;
  }
  return false;
}

module.exports = {
  sendTextMessage,
  sendTemplateMessage,
  sendMediaMessage,
  verifyWebhookSignature,
  processIncomingMessage,
  check24hWindow,
  get24hRemaining,
  getTemplatesFromMeta,
  syncTemplates,
  saveSentMessage,
  getConversationMessages,
  getUnreadCount,
  markAsRead,
  updateMessageStatus,
  autoExpireChatWindow,
  findRecordByPhone,
  VERIFY_TOKEN,
  PHONE_NUMBER_ID
};
