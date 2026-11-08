// Motor de subida a Dropi dentro de Pizdo.
//
// Cada tienda de Pizdo con LucidSales configurado es una "cuenta" del motor
// de subida, con sus propios servicios (cliente LucidSales, agente, subida
// automatica a Dropi, entregas programadas, intentos, sesion de Dropi) y su
// propia carpeta de datos: <MOTOR_DROPI_DATA_DIR>/<slug de la tienda>/.
//
// El codigo del motor se copia tal cual en backend/motor-dropi/. Aqui
// solo se arma: credenciales desde la Configuracion de Pizdo, acceso con el
// usuario ya autenticado por Pizdo y un manejador HTTP por tienda que se
// monta en Express bajo /api/motor-dropi.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { cargarConfig } from "../../../motor-dropi/config.js";
import { crearClienteInter } from "../../../motor-dropi/interrapidisimo.js";
import { crearServiciosCuenta, crearTurnoDropi } from "../../../motor-dropi/serviciosCuenta.js";
import { crearManejador } from "../../../motor-dropi/servidor.js";
import { ErrorApi } from "../../../motor-dropi/errores.js";
import { configurarClaveMaestra, cifradoActivo } from "../../../motor-dropi/secretos.js";

/** Rutas de archivo de una cuenta (mismas que cuentas.js del motor). */
export const RUTAS = {
  HISTORIAL: "historial.jsonl",
  CONVERSACION: "conversacion.jsonl",
  SUBIDA_AUTO: "subidaAutomatica.json",
  ASIGNACION: "asignacion.json",
  CREDENCIALES: "credenciales.json",
  ENVIOS: "envios.json",
  INTENTOS: "intentos.jsonl",
  PROGRAMADOS: "programados.json",
  ETIQUETAS: "etiquetas.json",
  AUDITORIA: "auditoria.jsonl",
  LUCIDBOT_PEDIDOS: "lucidbot-pedidos.json",
  LUCIDBOT_CONTACTOS_CONFIG: "config/lucidbot-contactos.json",
  LLM_CONFIG: "config/llm.json",
  MAPAS_CONFIG: "config/mapas.json",
  DROPI_PRODUCTOS_CONFIG: "config/productosDropi.json",
  APIKEY_CONFIG: "config/apikey.json",
  DROPI_PERFIL: "dropi-profile",
};

/** Lo que Pizdo deja pasar al motor. El resto lo hace Pizdo con su base. */
const PERMITIDAS = [
  /^\/api\/salud$/,
  /^\/api\/(subida|programados|dropi|llm|mapas|lucidbot|envios|interrapidisimo)(\/|$)/,
  /^\/api\/(historial|auditoria|configuracion\/estado)$/,
  /^\/api\/pedidos\/[^/]+\/(conversacion|validar|subir|direccion|direccion\/validar)$/,
];

export function rutaPermitida(ruta) {
  return PERMITIDAS.some((re) => re.test(ruta));
}

/** Navegador para Dropi: el del sistema (Chromium) si no se indica otro. */
function chromeDisponible() {
  const candidatos = [
    process.env.MOTOR_DROPI_CHROME,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidatos.find((c) => {
    try {
      fs.accessSync(c);
      return true;
    } catch {
      return false;
    }
  }) ?? candidatos[0] ?? "/usr/bin/chromium";
}

/**
 * Variables del motor: las de Pizdo con prefijo MOTOR_DROPI_ (MOTOR_DROPI_LLM_API_KEY ->
 * LLM_API_KEY). Las demas variables de Pizdo (PORT, DATABASE_URL...) no le
 * llegan, asi no se mezclan.
 */
const PREFIJO_ENV = "MOTOR_DROPI_";

function entornoMotor(dataDir) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith(PREFIJO_ENV)) env[k.slice(PREFIJO_ENV.length)] = v;
  }
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    TZ_ASIGNACION: "America/Bogota",
    DROPI_HEADLESS: "1",
    CORS_ORIGIN: "*",
    ...env,
    DATA_DIR: dataDir,
    DROPI_CHROME: env.DROPI_CHROME ?? chromeDisponible(),
  };
}

/**
 * Permisos del motor (numeros de LucidSales) a partir del usuario de Pizdo:
 *   admin               -> todo
 *   operador de pedidos -> "2" (Pedidos: subir, validar, ver intentos)
 *   "8" (Ajustes de la subida, sesion de Dropi, IA) solo admin.
 */
export function sesionDeUsuario(usuario, shopId, { interna = false } = {}) {
  if (interna) return { interna: true, usuario: null };
  const admin = usuario?.rol === "admin";
  const numeros = [];
  if (admin || usuario?.gestionaPedidos || usuario?.accesoLucidsales || usuario?.puedeModificarTodo) numeros.push("2");
  return {
    usuario: { id: usuario?.id ?? null, email: usuario?.email ?? null, nombre: usuario?.nombre ?? null },
    rol: { total: admin, numeros },
    idEmpresa: [String(shopId)],
    tienda: String(shopId),
  };
}

/**
 * fuentes:
 *   tiendas()          -> [{id, slug, nombre, shopId, email, password}] de Pizdo
 *   alResultado(evt)   -> se llama cuando un pedido se sube (para la base de Pizdo)
 */
export function crearMotor({ dataDir, tiendas, log = console }) {
  const base = cargarConfig(entornoMotor(dataDir));
  // claves guardadas desde los paneles (IA, Lucid Bot, Google Maps) cifradas
  // en disco y en la base con MOTOR_DROPI_CLAVE_MAESTRA
  configurarClaveMaestra(base.CLAVE_MAESTRA);
  if (!cifradoActivo()) log.warn?.("[motor-dropi] sin MOTOR_DROPI_CLAVE_MAESTRA: las claves de IA/Lucid Bot/Maps quedan sin cifrar");
  const inter = crearClienteInter(base);
  const turnoDropi = crearTurnoDropi({ log });
  /** tiendaId de Pizdo -> { cuenta, servicios, manejador, config, sesiones } */
  const activas = new Map();

  function configDe(t) {
    const carpeta = path.join(dataDir, t.slug);
    fs.mkdirSync(path.join(carpeta, "config"), { recursive: true });
    const c = { ...base };
    for (const [clave, rel] of Object.entries(RUTAS)) c[clave] = path.join(carpeta, rel);
    c.LUCID_EMAIL = t.email ?? "";
    c.LUCID_PASSWORD = t.password ?? "";
    c.LUCID_TIENDA = String(t.shopId ?? "");
    c.CUENTA_ID = t.slug;
    // la API_KEY de integraciones solo si se pone MOTOR_DROPI_API_KEY_<SLUG>
    c.API_KEY = String(process.env[`${PREFIJO_ENV}API_KEY_${t.slug.toUpperCase()}`] ?? "");
    return c;
  }

  function crear(t) {
    const config = configDe(t);
    const cuenta = { id: t.slug, nombre: t.nombre, tiendas: [String(t.shopId)] };
    const servicios = crearServiciosCuenta({ cuenta, config, inter, turnoDropi });
    // sesiones de un solo uso: Pizdo ya autentico al usuario; el motor recibe
    // un token opaco y lo cambia por la sesion armada desde ese usuario
    const sesiones = new Map();
    const verificarSesion = {
      async verificar(token) {
        const s = sesiones.get(String(token ?? ""));
        if (!s) throw new ErrorApi(401, "Sesión no válida: vuelve a entrar a Pizdo");
        return s;
      },
    };
    const manejador = crearManejador({
      config,
      inter,
      cliente: servicios.cliente,
      historial: servicios.historial,
      asignacion: servicios.asignacion,
      reparto: servicios.reparto,
      credenciales: servicios.credenciales,
      llmConfig: servicios.llmConfig,
      validadorDireccion: servicios.validadorDireccion,
      conversacion: servicios.conversacion,
      dropiCliente: servicios.dropiCliente,
      dropiNavegador: servicios.dropiNavegador,
      subidaAuto: servicios.subidaAuto,
      lucidBotContactos: servicios.lucidBotContactos,
      resolverProductoDropi: servicios.resolverProductoDropi,
      productosDropi: servicios.productosDropi,
      estadosEnvio: servicios.estadosEnvio,
      apiKeys: servicios.apiKeys,
      pedidosLucidBot: servicios.pedidosLucidBot,
      registroIntentos: servicios.registroIntentos,
      programados: servicios.programados,
      etiquetas: servicios.etiquetas,
      auditoria: servicios.auditoria,
      verificarSesion,
      tiendasCuenta: () => [String(t.shopId)],
    });
    const x = { tienda: t, cuenta, config, servicios, manejador, sesiones };
    activas.set(t.id, x);
    servicios.arrancar();
    // el reparto propio del motor queda apagado: en Pizdo reparte Pizdo
    try {
      if (servicios.asignacion.getConfig?.()?.automatico) servicios.asignacion.setConfig?.({ automatico: false });
    } catch {
      /* sin reparto */
    }
    log.log?.(`[motor-dropi] tienda ${t.slug} (LucidSales ${t.shopId}) lista · subida ${servicios.subidaAuto.config().automatico ? "ACTIVA" : "apagada"}`);
    return x;
  }

  /** Crea/actualiza las tiendas (credenciales nuevas, tiendas nuevas). */
  async function refrescar() {
    const lista = await tiendas();
    for (const t of lista) {
      const x = activas.get(t.id);
      if (!x) {
        try {
          crear(t);
        } catch (e) {
          log.warn?.(`[motor-dropi] no se pudo montar la tienda ${t.slug}:`, e?.message ?? e);
        }
        continue;
      }
      // credenciales cambiadas en Configuracion de Pizdo: el cliente las lee
      // de config en cada login, basta con actualizarlas
      x.config.LUCID_EMAIL = t.email ?? "";
      x.config.LUCID_PASSWORD = t.password ?? "";
      if (String(t.shopId) !== x.config.LUCID_TIENDA) {
        x.config.LUCID_TIENDA = String(t.shopId);
        x.cuenta.tiendas = [String(t.shopId)];
        x.tienda = t;
      }
    }
    return [...activas.values()];
  }

  function de(tiendaId) {
    return activas.get(tiendaId) ?? null;
  }

  /**
   * Atiende una peticion del panel de Pizdo con el motor de su tienda.
   *   req: peticion "cruda" (stream con method/url/headers), res: ServerResponse
   */
  async function atender(tiendaId, usuario, req, res, { interna = false } = {}) {
    const x = de(tiendaId);
    if (!x) {
      res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, msg: "La subida a Dropi no está disponible para esta tienda: falta configurar LucidSales (email, clave y tienda)" }));
      return;
    }
    const token = `pizdo.${crypto.randomBytes(18).toString("hex")}`;
    x.sesiones.set(token, sesionDeUsuario(usuario, x.config.LUCID_TIENDA, { interna }));
    const limpiar = () => x.sesiones.delete(token);
    res.once("finish", limpiar);
    res.once("close", limpiar);
    req.headers["x-token"] = token;
    req.headers["x-tienda"] = x.config.LUCID_TIENDA;
    req.headers["x-usuario"] = usuario?.email ?? "";
    delete req.headers["x-api-key"];
    await x.manejador.atender(req, res);
  }

  function detener() {
    for (const x of activas.values()) {
      try {
        x.servicios.detener();
      } catch {
        /* nada */
      }
      x.servicios.dropiNavegador?.cerrar?.().catch?.(() => {});
    }
  }

  return { refrescar, de, atender, detener, activas, base };
}
