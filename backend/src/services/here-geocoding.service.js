const GEOCODE_URL = 'https://geocode.search.hereapi.com/v1/geocode';

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
  return direccion.trim().toLowerCase();
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

function parseResult(item) {
  const addr = item.address || {};
  const scoring = item.scoring || {};

  return {
    resultType: item.resultType || '',
    houseNumberType: item.houseNumberType || '',
    queryScore: scoring.queryScore || 0,
    direccion: addr.label || item.title || '',
    ciudad: addr.city || '',
    departamento: addr.state || addr.county || '',
    distrito: addr.district || '',
    calle: addr.street || '',
    numero: addr.houseNumber || '',
    codigoPostal: addr.postalCode || '',
    pais: addr.countryName || '',
    lat: item.position?.lat || 0,
    lng: item.position?.lng || 0
  };
}

async function geocode(direccion, options = {}) {
  const apiKey = process.env.HERE_API_KEY;
  if (!apiKey) {
    return { exito: false, items: [], error: 'HERE_API_KEY no configurada' };
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
    let queryDir = direccion.trim();
    if (options.ciudad) {
      queryDir += `, ${options.ciudad}`;
      if (options.departamento) queryDir += `, ${options.departamento}`;
    }

    const params = new URLSearchParams({
      q: queryDir,
      in: `countryCode:${options.pais || 'COL'}`,
      lang: 'es',
      limit: String(options.limit || 3)
    });
    if (options.apiKey) params.set('apiKey', options.apiKey);

    const url = `${GEOCODE_URL}?${params.toString()}`;

    const resp = await fetch(url, {
      headers: options.apiKey
        ? {}
        : { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      let errorMsg = `HTTP ${resp.status}`;
      if (resp.status === 401 || resp.status === 403) errorMsg = 'API key inválida o sin permisos';
      if (resp.status === 429) errorMsg = 'Rate limit excedido en HERE API';
      return { exito: false, items: [], error: errorMsg };
    }

    const data = await resp.json();
    const items = (data.items || []).slice(0, options.limit || 3).map(parseResult);

    const result = { exito: true, items, error: null };
    if (items.length > 0) {
      setCache(direccion, result);
    }

    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return { exito: false, items: [], error: 'Timeout: HERE API no respondió a tiempo' };
    }
    return { exito: false, items: [], error: error.message || 'Error de conexión con HERE API' };
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
    case 'postalCodePoint':
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
