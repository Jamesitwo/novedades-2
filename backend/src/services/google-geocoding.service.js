const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let lastRequestTime = 0;
const MIN_INTERVAL_MS = 100;

async function rateLimit() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestTime);
  if (wait > 0) {
    await new Promise(r => setTimeout(r, wait));
  }
  lastRequestTime = Date.now();
}

function getCacheKey(direccion) {
  return 'gm:' + direccion.trim().toLowerCase();
}

function getFromCache(direccion) {
  const key = getCacheKey(direccion);
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  if (entry) cache.delete(key);
  return null;
}

function setCache(direccion, data) {
  const key = getCacheKey(direccion);
  cache.set(key, { data, timestamp: Date.now() });
}

function parseComponent(addressComponents) {
  const comps = {};
  for (const c of addressComponents || []) {
    for (const t of c.types) {
      if (!comps[t]) comps[t] = c.long_name;
    }
  }
  return comps;
}

function parseResult(item) {
  const comps = parseComponent(item.address_components);
  const geo = item.geometry || {};

  let resultType = '';
  let houseNumberType = '';
  switch (geo.location_type) {
    case 'ROOFTOP':
      resultType = 'houseNumber';
      houseNumberType = 'PA';
      break;
    case 'RANGE_INTERPOLATED':
      resultType = 'houseNumber';
      houseNumberType = 'interpolated';
      break;
    case 'GEOMETRIC_CENTER':
      resultType = 'street';
      houseNumberType = '';
      break;
    case 'APPROXIMATE':
      if (comps.route || comps.street_address) {
        resultType = 'street';
      } else if (comps.locality || comps.postal_code) {
        resultType = 'locality';
      } else {
        resultType = 'administrativeArea';
      }
      houseNumberType = '';
      break;
    default:
      resultType = comps.route ? 'street' : comps.locality ? 'locality' : 'administrativeArea';
      houseNumberType = '';
  }

  // Check if partial_match
  const queryScore = item.partial_match ? 0.6 : 0.92;

  const addressLabel = item.formatted_address || '';

  return {
    resultType,
    houseNumberType,
    queryScore,
    direccion: addressLabel,
    ciudad: comps.locality || comps.administrative_area_level_2 || comps.postal_town || '',
    departamento: comps.administrative_area_level_1 || '',
    distrito: comps.sublocality || comps.neighborhood || '',
    calle: comps.route || '',
    numero: comps.street_number || '',
    codigoPostal: comps.postal_code || '',
    pais: comps.country || '',
    lat: geo.location?.lat || 0,
    lng: geo.location?.lng || 0
  };
}

async function geocode(direccion, options = {}) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { exito: false, items: [], error: 'GOOGLE_MAPS_API_KEY no configurada' };
  }

  if (!direccion || direccion.trim().length < 3) {
    return { exito: false, items: [], error: 'Dirección muy corta para geocodificar' };
  }

  const cached = getFromCache(direccion);
  if (cached) return cached;

  await rateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 5000);

  try {
    const params = new URLSearchParams({
      address: direccion.trim(),
      components: `country:${options.pais || 'CO'}`,
      language: 'es',
      key: apiKey
    });

    const url = `${GEOCODE_URL}?${params.toString()}`;

    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      if (resp.status === 403) return { exito: false, items: [], error: 'API key inválida o sin permisos (verifica que Geocoding API esté habilitada)' };
      if (resp.status === 429) return { exito: false, items: [], error: 'Rate limit excedido en Google Maps API' };
      return { exito: false, items: [], error: `HTTP ${resp.status}` };
    }

    const data = await resp.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      const errorMap = {
        'REQUEST_DENIED': 'API key inválida o Geocoding API no habilitada',
        'OVER_QUERY_LIMIT': 'Rate limit excedido en Google Maps API',
        'INVALID_REQUEST': 'Solicitud inválida',
        'UNKNOWN_ERROR': 'Error desconocido en Google Maps'
      };
      return { exito: false, items: [], error: errorMap[data.status] || data.error_message || data.status };
    }

    if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
      return { exito: true, items: [], error: null };
    }

    const items = data.results.slice(0, options.limit || 3).map(parseResult);

    const result = { exito: true, items, error: null };
    if (items.length > 0) {
      setCache(direccion, result);
    }

    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { exito: false, items: [], error: 'Timeout: Google Maps API no respondió a tiempo' };
    }
    return { exito: false, items: [], error: error.message || 'Error de conexión con Google Maps API' };
  }
}

function getBestResult(geoResult) {
  if (!geoResult?.exito || !geoResult.items?.length) return null;

  const items = geoResult.items;

  const exactMatch = items.find(i =>
    i.resultType === 'houseNumber' && i.houseNumberType === 'PA'
  );
  if (exactMatch) return exactMatch;

  const houseMatch = items.find(i => i.resultType === 'houseNumber');
  if (houseMatch) return houseMatch;

  return items[0];
}

function calculateGeoScore(bestResult) {
  if (!bestResult) return { score: 0, level: 'none' };

  let score = 0;
  let level = 'none';

  switch (bestResult.resultType) {
    case 'houseNumber':
      level = bestResult.houseNumberType === 'PA' ? 'exact' : 'houseNumber';
      score = bestResult.houseNumberType === 'PA' ? 30 : 25;
      break;
    case 'street':
      level = 'street';
      score = 15;
      break;
    case 'intersection':
      level = 'intersection';
      score = 12;
      break;
    case 'locality':
      level = 'locality';
      score = 5;
      break;
    default:
      level = 'area';
      score = 2;
  }

  if (bestResult.queryScore > 0) {
    score += Math.round(bestResult.queryScore * 20);
  }

  return { score: Math.min(50, score), level };
}

module.exports = {
  geocode,
  getBestResult,
  calculateGeoScore,
  GEOCODE_URL
};
