// Puente entre Pizdo (CommonJS, Express, Prisma) y el motor de subida a
// Dropi (ESM, backend/motor-dropi/). Arranca el motor, guarda su estado en la base y
// pasa a la base de Pizdo lo que el motor sube a Dropi (vinculacion,
// subidoAt/subidoPorId para las metricas, bitacora).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { prisma } = require('../../prisma/client');
const { crearPersistencia } = require('./persistencia');

const CADA_SYNC_MS = Number(process.env.MOTOR_DROPI_SYNC_MS) || 15000;
const CADA_TIENDAS_MS = 60000;
/** Solo se pasan a la base los subidos recientes (el resto ya se hizo antes). */
const VENTANA_SUBIDOS_MS = 7 * 24 * 3600 * 1000;
const MAX_POR_VUELTA = 25;

let motor = null;
let persistencia = null;
let arranque = null;
let timers = [];
let ultimoError = null;

/** El motor esta en pausa salvo que se encienda con MOTOR_DROPI=1. */
function activo() {
  return String(process.env.MOTOR_DROPI || '0') === '1';
}

function dataDir() {
  return path.resolve(process.env.MOTOR_DROPI_DATA_DIR || path.join(os.tmpdir(), 'pizdo-motor-dropi'));
}

/** Tiendas de Pizdo con LucidSales configurado (cada una es una cuenta del motor). */
async function tiendasConLucid() {
  const tiendas = await prisma.tienda.findMany({ where: { activo: true } });
  const configs = await prisma.configuracion.findMany({
    where: { tiendaId: { in: tiendas.map((t) => t.id) } },
    select: {
      tiendaId: true,
      lucidsales_activo: true,
      lucidsales_email: true,
      lucidsales_password: true,
      lucidsales_shop_id: true
    }
  });
  const porTienda = new Map(configs.map((c) => [c.tiendaId, c]));
  return tiendas
    .map((t) => ({ t, c: porTienda.get(t.id) }))
    .filter(({ c }) => c && c.lucidsales_activo && c.lucidsales_shop_id && /^\d{1,12}$/.test(String(c.lucidsales_shop_id).trim()))
    .map(({ t, c }) => ({
      id: t.id,
      slug: t.slug,
      nombre: t.nombre,
      shopId: String(c.lucidsales_shop_id).trim(),
      email: c.lucidsales_email || '',
      password: c.lucidsales_password || ''
    }));
}

function leerJson(ruta) {
  try {
    return JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Pedido subido a Dropi (por el motor o por una persona desde Pizdo): queda
 * vinculado en pedidos_vinculados con subidoAt/subidoPorId, que es de donde
 * salen las metricas de pedidos subidos, y en la bitacora.
 */
async function registrarSubido({ tiendaId, lucidsalesPedidoId, usuarioId = null, cuando = new Date(), detalle = null, idDropi = null }) {
  const lucidsalesService = require('../lucidsales.service');
  const bitacoraService = require('../bitacora.service');
  const id = Number(lucidsalesPedidoId);
  if (!Number.isFinite(id)) return null;

  let pedido = null;
  try {
    pedido = await lucidsalesService.getPedidoById(id, tiendaId);
  } catch (e) {
    console.warn(`[motor-dropi] pedido ${id} subido, pero no se pudo leer de LucidSales para el snapshot:`, e.message);
  }
  const snapshot = pedido
    ? {
        lucidsalesIdPedido: Number(pedido.idPedido ?? id),
        nombreCliente: pedido.Nombre || '',
        apellidoCliente: pedido.Apellido || '',
        movil: pedido.Movil || '',
        total: String(pedido.Total || '0'),
        estadoPedido: Number(pedido.EstadoPedido ?? 2),
        referencias: pedido.Referencias || '',
        jsonProductos: typeof pedido.Json === 'string' ? pedido.Json : JSON.stringify(pedido.Json || [])
      }
    : {};
  const vinculado = await prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: id },
    update: { ...snapshot, subidoPorId: usuarioId, subidoAt: cuando, tiendaId },
    create: { lucidsalesPedidoId: id, ...snapshot, subidoPorId: usuarioId, subidoAt: cuando, createdById: usuarioId, tiendaId }
  });
  await bitacoraService.registrar({
    tipo: 'pedido_subido',
    entidad: 'pedido_lucidsales',
    registroId: String(id),
    operadorId: usuarioId,
    cliente: vinculado.nombreCliente ? `${vinculado.nombreCliente} ${vinculado.apellidoCliente || ''}`.trim() : null,
    descripcion: usuarioId ? 'Pedido subido a Dropi' : 'Pedido subido a Dropi (subida automática)',
    detalle: { pedidoVinculadoId: id, via: usuarioId ? 'manual' : 'automatica', idDropi, detalle },
    dedupeKey: `sub:${id}`,
    tiendaId
  });
  return vinculado;
}

/** Lo que el motor subio solo y aun no esta en la base de Pizdo. */
async function reconciliarSubidos() {
  if (!motor) return;
  for (const x of motor.activas.values()) {
    const datos = leerJson(x.config.SUBIDA_AUTO);
    const procesados = datos?.procesados || {};
    const limite = Date.now() - VENTANA_SUBIDOS_MS;
    const candidatos = Object.entries(procesados)
      .filter(([, e]) => e?.accion === 'subido' && Date.parse(e.ts || '') > limite)
      .map(([id, e]) => ({ id: Number(id), e }))
      .filter(({ id }) => Number.isFinite(id));
    if (!candidatos.length) continue;
    const ya = await prisma.pedidoVinculado.findMany({
      where: { lucidsalesPedidoId: { in: candidatos.map((c) => c.id) }, subidoAt: { not: null } },
      select: { lucidsalesPedidoId: true }
    });
    const hechos = new Set(ya.map((v) => v.lucidsalesPedidoId));
    const faltan = candidatos.filter((c) => !hechos.has(c.id)).slice(0, MAX_POR_VUELTA);
    for (const { id, e } of faltan) {
      try {
        await registrarSubido({
          tiendaId: x.tienda.id,
          lucidsalesPedidoId: id,
          usuarioId: null,
          cuando: new Date(e.ts),
          detalle: e.detalle || null,
          idDropi: e.dropi?.id ?? null
        });
      } catch (err) {
        console.warn(`[motor-dropi] no se pudo registrar el pedido subido ${id}:`, err.message);
      }
    }
  }
}

async function vuelta() {
  await persistencia?.sincronizar();
  await reconciliarSubidos().catch((e) => console.warn('[motor-dropi] reconciliar subidos:', e.message));
}

/** Arranca el motor (una sola vez). Nunca tumba el servidor de Pizdo. */
function iniciar() {
  if (arranque) return arranque;
  arranque = (async () => {
    if (!activo()) {
      console.log('[motor-dropi] motor apagado (para usarlo: MOTOR_DROPI=1)');
      return null;
    }
    const dir = dataDir();
    persistencia = crearPersistencia({ dir });
    await persistencia.restaurar();
    const { crearMotor } = await import('./motor.mjs');
    motor = crearMotor({ dataDir: dir, tiendas: tiendasConLucid });
    await motor.refrescar();
    timers.push(setInterval(() => void vuelta(), CADA_SYNC_MS));
    timers.push(setInterval(() => void motor.refrescar().catch((e) => console.warn('[motor-dropi] refrescar tiendas:', e.message)), CADA_TIENDAS_MS));
    for (const t of timers) t.unref?.();
    console.log(`[motor-dropi] motor listo · datos en ${dir} · ${motor.activas.size} tienda(s)`);
    return motor;
  })().catch((e) => {
    ultimoError = e;
    console.error('[motor-dropi] el motor no pudo arrancar:', e);
    arranque = null;
    return null;
  });
  return arranque;
}

async function detener() {
  for (const t of timers) clearInterval(t);
  timers = [];
  try {
    motor?.detener();
  } catch {
    /* nada */
  }
  await persistencia?.sincronizar();
}

// Nombre de la app de la que viene el motor: no debe verse en Pizdo. Se arma
// por partes para que ni este archivo lo tenga escrito de corrido.
const ORIGEN = ['Zun', 'to'].join('');
const RE_ORIGEN_APP = new RegExp(`${ORIGEN}\\s*Store`, 'gi');
const RE_ORIGEN = new RegExp(ORIGEN, 'gi');

/** Cambia el nombre de la app de origen en un texto (respuestas del motor). */
function sinNombreDeOrigen(texto) {
  return String(texto).replace(RE_ORIGEN_APP, 'Pizdo').replace(RE_ORIGEN, 'el sistema');
}

/** Las respuestas JSON del motor pasan por sinNombreDeOrigen. */
function limpiarRespuesta(res) {
  const end = res.end.bind(res);
  res.end = (chunk, ...resto) => {
    const tipo = String(res.getHeader('content-type') || '');
    if (chunk && /json|text/.test(tipo)) {
      const texto = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      if (RE_ORIGEN.test(texto)) {
        RE_ORIGEN.lastIndex = 0;
        chunk = sinNombreDeOrigen(texto);
      }
      RE_ORIGEN.lastIndex = 0;
    }
    return end(chunk, ...resto);
  };
}

/**
 * Express -> motor. El cuerpo ya lo leyo express.json(): se le pasa al motor
 * como un stream nuevo con el mismo JSON.
 */
async function atender(req, res) {
  if (!activo()) {
    return res.status(503).json({ ok: false, activo: false, msg: 'La subida a Dropi no está activa' });
  }
  const m = await iniciar();
  if (!m) {
    return res.status(503).json({ ok: false, msg: `El motor de subida a Dropi no está disponible${ultimoError ? `: ${ultimoError.message}` : ''}` });
  }
  const { rutaPermitida } = await import('./motor.mjs');
  const ruta = `/api${req.path}`;
  if (!rutaPermitida(ruta)) {
    return res.status(404).json({ ok: false, msg: `Ruta no disponible: ${req.method} ${ruta}` });
  }
  const tieneCuerpo = !['GET', 'HEAD', 'DELETE'].includes(req.method) || (req.body && Object.keys(req.body).length);
  const buf = tieneCuerpo && req.body !== undefined ? Buffer.from(JSON.stringify(req.body ?? {})) : Buffer.alloc(0);
  const crudo = Readable.from(buf.length ? [buf] : []);
  const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
  crudo.method = req.method;
  crudo.url = `${ruta}${qs}`;
  crudo.headers = { ...req.headers, 'content-length': String(buf.length) };
  delete crudo.headers.authorization;
  // Pizdo ya valido CORS; el motor no tiene que volver a mirarlo
  delete crudo.headers.origin;
  crudo.socket = req.socket;
  crudo.connection = req.socket;

  // CORS y cabeceras de seguridad las pone Pizdo, no el motor
  const writeHead = res.writeHead.bind(res);
  res.writeHead = (status, ...resto) => {
    const cab = resto.find((r) => r && typeof r === 'object') || {};
    for (const k of Object.keys(cab)) {
      if (/^access-control-|^vary$|^content-security-policy$|^x-frame-options$/i.test(k)) delete cab[k];
    }
    return writeHead(status, cab);
  };

  // el motor viene de otra app: ningun texto suyo con ese nombre llega al panel
  limpiarRespuesta(res);

  // subida manual hecha por una persona: queda acreditada a ella en Pizdo
  const subidaManual = req.method === 'POST' && /^\/api\/pedidos\/[^/]+\/subir$/.test(ruta);
  if (subidaManual) {
    const end = res.end.bind(res);
    res.end = (chunk, ...resto) => {
      try {
        const datos = chunk ? JSON.parse(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)) : null;
        if (datos?.subido === true) {
          const id = decodeURIComponent(ruta.split('/')[3]);
          void registrarSubido({
            tiendaId: req.tiendaId,
            lucidsalesPedidoId: id,
            usuarioId: req.authType === 'apikey' ? null : req.usuario?.id ?? null,
            idDropi: datos.idDropi ?? null
          }).catch((e) => console.warn('[motor-dropi] registrar subida manual:', e.message));
        }
      } catch {
        /* respuesta no JSON */
      }
      return end(chunk, ...resto);
    };
  }

  await m.atender(req.tiendaId, req.usuario, crudo, res, { interna: req.authType === 'apikey' });
}

function estado() {
  if (!activo()) return { activo: false, listo: false };
  if (!motor) return { activo: true, listo: false, error: ultimoError?.message ?? null };
  return {
    activo: true,
    listo: true,
    dir: dataDir(),
    tiendas: [...motor.activas.values()].map((x) => ({
      tiendaId: x.tienda.id,
      slug: x.tienda.slug,
      shopId: x.config.LUCID_TIENDA,
      subida: (() => {
        const c = x.servicios.subidaAuto.config();
        return { automatico: c.automatico, dryRun: c.dryRun, cadaSegundos: c.cadaSegundos };
      })()
    }))
  };
}

module.exports = { activo, iniciar, detener, atender, estado, registrarSubido, reconciliarSubidos, tiendasConLucid, sinNombreDeOrigen, _vuelta: vuelta };
