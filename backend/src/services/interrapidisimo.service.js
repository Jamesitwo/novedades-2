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

async function buscarOficinaPrincipal(nombreCiudad) {
  const ciudades = await getCiudadesIR();
  const normalized = normalizarNombre(nombreCiudad);
  const match = ciudades.find(c => normalizarNombre(c.Descripcion) === normalized);
  if (!match) {
    throw new Error(`Ciudad "${nombreCiudad}" no encontrada en Inter Rapidísimo`);
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
