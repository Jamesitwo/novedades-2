// Persistencia del motor de subida a Dropi en la base de datos de Pizdo.
//
// El motor (backend/motor-dropi/) lee y escribe
// sus archivos JSON/JSONL y el perfil de Chrome de Dropi en una carpeta de
// datos. Esta capa hace que esos archivos vivan tambien en Postgres
// (tabla motor_archivos):
//
//   * al arrancar  -> restaurar(): escribe en disco lo que haya en la base
//                     (si en disco hay una version mas nueva, se respeta)
//   * cada N seg   -> sincronizar(): sube a la base lo que cambio en disco
//   * al apagar    -> sincronizar() una ultima vez
//
// Asi un redeploy (disco efimero) no pierde la configuracion, los pedidos ya
// procesados, las entregas programadas ni la sesion de Dropi.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// el cliente de la base se carga al usarse (asi `listar` sirve en scripts sueltos)
const db = () => require('../../prisma/client').prisma;

const MAX_BYTES = 8 * 1024 * 1024;

// Del perfil de Chrome solo importa lo que guarda la sesion (cookies,
// localStorage, IndexedDB, preferencias). Los caches se regeneran solos.
const IGNORAR = [
  /(^|\/)(Cache|Code Cache|GPUCache|GrShaderCache|ShaderCache|DawnCache|DawnGraphiteCache|DawnWebGPUCache|GraphiteDawnCache)(\/|$)/,
  /(^|\/)(Service Worker\/CacheStorage|Service Worker\/ScriptCache)(\/|$)/,
  /(^|\/)(component_crx_cache|extensions_crx_cache|BrowserMetrics|Crashpad|Safe Browsing|OptimizationHints|optimization_guide_model_store|OnDeviceHeadSuggestModel|segmentation_platform|AutofillAiModelCache|Subresource Filter|hyphen-data|ZxcvbnData|WidevineCdm|MEIPreload|FirstPartySetsPreloaded|TrustTokenKeyCommitments|OriginTrials|PKIMetadata|SSLErrorAssistant|CertificateRevocation|FileTypePolicies|Crowd Deny|SafetyTips|AmountExtractionHeuristicRegexes|CookieReadinessList|PrivacySandboxAttestationsPreloaded|ProbabilisticRevealTokenRegistry|TpcdMetadata|commerce_heuristics|screen_ai)(\/|$)/,
  /(^|\/)Singleton[^/]*$/,
  /(^|\/)(LOCK|lockfile|\.lock)$/,
  /\.(pma|tmp|log)$/i,
  /(^|\/)[^/]*-journal$/
];

function ignorado(rel) {
  return IGNORAR.some((re) => re.test(rel));
}

function hashDe(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

/** Lista recursiva de archivos (rutas relativas con "/"). */
function listar(dir, base = dir, salida = []) {
  let entradas = [];
  try {
    entradas = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return salida;
  }
  for (const e of entradas) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (ignorado(rel)) continue;
    if (e.isDirectory()) listar(abs, base, salida);
    else if (e.isFile()) salida.push(rel);
  }
  return salida;
}

function crearPersistencia({ dir, log = console }) {
  /** ruta -> hash que ya esta en la base (evita reescribir lo que no cambio) */
  const enBase = new Map();
  let corriendo = null;

  async function restaurar() {
    fs.mkdirSync(dir, { recursive: true });
    const filas = await db().motorArchivo.findMany();
    let escritos = 0;
    for (const f of filas) {
      enBase.set(f.ruta, f.hash);
      const abs = path.join(dir, ...f.ruta.split('/'));
      if (!abs.startsWith(path.resolve(dir))) continue;
      try {
        const st = fs.statSync(abs);
        // un volumen persistente con una version mas nueva manda
        if (st.mtimeMs > f.updatedAt.getTime()) continue;
      } catch {
        /* no existe: se restaura */
      }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, Buffer.from(f.contenido));
      escritos++;
    }
    log.log?.(`[motor-dropi] estado restaurado desde la base: ${escritos}/${filas.length} archivo(s)`);
    return { total: filas.length, escritos };
  }

  async function sincronizarAhora() {
    const vistos = new Set();
    let subidos = 0;
    for (const rel of listar(dir)) {
      const abs = path.join(dir, ...rel.split('/'));
      let buf;
      try {
        const st = fs.statSync(abs);
        if (st.size > MAX_BYTES) continue;
        buf = fs.readFileSync(abs);
      } catch {
        continue;
      }
      vistos.add(rel);
      const h = hashDe(buf);
      if (enBase.get(rel) === h) continue;
      await db().motorArchivo.upsert({
        where: { ruta: rel },
        update: { contenido: buf, hash: h, tamano: buf.length },
        create: { ruta: rel, contenido: buf, hash: h, tamano: buf.length }
      });
      enBase.set(rel, h);
      subidos++;
    }
    // lo que el motor borro de disco tambien sale de la base
    const borrados = [...enBase.keys()].filter((r) => !vistos.has(r));
    if (borrados.length) {
      await db().motorArchivo.deleteMany({ where: { ruta: { in: borrados } } });
      for (const r of borrados) enBase.delete(r);
    }
    return { subidos, borrados: borrados.length };
  }

  /** Nunca dos sincronizaciones a la vez; un fallo se reintenta en la siguiente. */
  async function sincronizar() {
    if (corriendo) return corriendo;
    corriendo = sincronizarAhora()
      .catch((e) => {
        log.warn?.('[motor-dropi] no se pudo guardar el estado en la base:', e.message);
        return { error: e.message };
      })
      .finally(() => {
        corriendo = null;
      });
    return corriendo;
  }

  /** Importa archivos de una carpeta de datos del motor a la carpeta de una cuenta. */
  function importarArchivo(relDestino, contenido) {
    const abs = path.join(dir, ...relDestino.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido);
  }

  return { restaurar, sincronizar, importarArchivo, dir };
}

module.exports = { crearPersistencia, listar, ignorado };
