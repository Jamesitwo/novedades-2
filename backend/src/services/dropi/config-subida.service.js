const { prisma } = require('../../prisma/client');

// Configuracion de la subida automatica a Dropi, una fila por tienda.
// La fila se crea con los defaults seguros al primer acceso:
//   automatico = false  (nadie sube nada hasta que se enciende)
//   dryRun     = true   (aunque se encienda, primero solo prepara)

const CAMPOS_JSON = ['estados', 'transportadoras', 'reglasProducto', 'tiendasDropi', 'programados', 'duplicadosAprobados'];

/** Fila cruda de Prisma -> objeto con los campos JSON ya parseados. */
function aObjeto(fila) {
  if (!fila) return null;
  const out = { ...fila };
  for (const c of CAMPOS_JSON) {
    if (typeof out[c] === 'string') {
      try { out[c] = JSON.parse(out[c]); } catch { out[c] = c === 'estados' || c === 'transportadoras' ? [] : {}; }
    }
  }
  if (typeof out.sesionDropi === 'string' && out.sesionDropi) {
    try { out.sesionDropi = JSON.parse(out.sesionDropi); } catch { out.sesionDropi = null; }
  }
  // aliases en camelCase que el motor espera
  out.cadaSegundos = out.cadaSegundos;
  out.minCalificacionDireccion = out.minCalificacionDireccion;
  out.maxIntentos = out.maxIntentos;
  out.envioMaxPesos = out.envioMaxPesos;
  out.envioMaxPorcentaje = out.envioMaxPorcentaje;
  out.oficinaInter = out.oficinaInter;
  out.detectarOficinaInter = out.detectarOficinaInter;
  return out;
}

/** Objeto con campos ya parseados -> datos planos para Prisma (re-serializa JSON). */
function aDatos(updates = {}) {
  const data = { ...updates };
  for (const c of CAMPOS_JSON) {
    if (data[c] !== undefined && typeof data[c] !== 'string') {
      data[c] = JSON.stringify(data[c] ?? (c === 'estados' || c === 'transportadoras' ? [] : {}));
    }
  }
  if (data.sesionDropi !== undefined && data.sesionDropi !== null && typeof data.sesionDropi !== 'string') {
    data.sesionDropi = JSON.stringify(data.sesionDropi);
  }
  return data;
}

/** Trae (creandola si no existe) la configuracion de subida de una tienda. */
async function getConfig(tiendaId) {
  if (!tiendaId) throw new Error('getConfigSubidaDropi: falta tiendaId');
  const existente = await prisma.configSubidaDropi.findUnique({ where: { tiendaId } });
  if (existente) return aObjeto(existente);
  const creada = await prisma.configSubidaDropi.create({ data: { tiendaId } });
  return aObjeto(creada);
}

/** Actualiza campos de la configuracion. Acepta JSON ya parseado en los campos JSON. */
async function updateConfig(tiendaId, updates) {
  const data = aDatos(updates);
  const fila = await prisma.configSubidaDropi.upsert({
    where: { tiendaId },
    update: data,
    create: { tiendaId, ...data }
  });
  return aObjeto(fila);
}

/** Solo las configuraciones de las tiendas con subida encendida (para el tick). */
async function configsActivas() {
  const filas = await prisma.configSubidaDropi.findMany({ where: { automatico: true } });
  return filas.map(aObjeto);
}

module.exports = { getConfig, updateConfig, configsActivas, aObjeto, aDatos };
