const BASE_URL = 'https://www3.interrapidisimo.com/Apicanalesventa/api/';

let _ciudadesCache = null;

async function fetchIR(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`Inter Rapidísimo API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function normalizarNombre(text) {
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();
}

async function getCiudadesIR() {
  if (_ciudadesCache) return _ciudadesCache;
  const data = await fetchIR('Ciudad_CV/ObtenerCiudades');
  _ciudadesCache = data;
  return data;
}

async function buscarOficinaPrincipal(nombreCiudad, departamento) {
  const ciudades = await getCiudadesIR();
  const normalized = normalizarNombre(nombreCiudad);

  const candidates = ciudades.filter(c => {
    const irName = normalizarNombre(c.Descripcion);
    if (!irName) return false;
    const irTokens = irName.split(/\s+/).filter(Boolean);
    const lsTokens = normalized.split(/\s+/).filter(Boolean);
    const commonTokens = irTokens.filter(t => lsTokens.includes(t));
    const shortestLen = Math.min(irTokens.length, lsTokens.length);
    const minTokens = Math.max(shortestLen <= 1 ? 1 : 2, shortestLen - 1);
    return commonTokens.length >= minTokens;
  });

  if (candidates.length === 0) {
    throw new Error(`Ciudad "${nombreCiudad}" no encontrada en Inter Rapidísimo`);
  }

  let match = candidates[0];
  if (candidates.length > 1 && departamento) {
    const deptoNorm = normalizarNombre(departamento);
    const byDepto = candidates.find(c => normalizarNombre(c.Departamento).includes(deptoNorm));
    if (byDepto) match = byDepto;
  }

  const oficinas = await fetchIR(
    `CentroServicio_CV/ObtenerOficinaPrincipalCiudad?idCiudad=${match.IdCiudad}`
  );
  return Array.isArray(oficinas) ? oficinas : [];
}

module.exports = {
  getCiudadesIR,
  buscarOficinaPrincipal,
  normalizarNombre
};
