const { prisma } = require('../prisma/client');

const BASE_URL = 'https://panel.lucidsales.co/b';

let tokenCache = null;
let tokenExpires = null;
let shopIdCache = null;

async function getConfig() {
  const config = await prisma.configuracion.findFirst();
  console.log('[LucidSales] Config from DB:', config ? {
    activo: config.lucidsales_activo,
    email: config.lucidsales_email,
    shop_id: config.lucidsales_shop_id,
    has_token: !!config.lucidsales_token,
    token_expires: config.lucidsales_token_expires
  } : 'null');
  if (!config || !config.lucidsales_activo) {
    throw new Error('LucidSales no está configurado o activo');
  }
  if (!config.lucidsales_email || !config.lucidsales_password || !config.lucidsales_shop_id) {
    throw new Error('Faltan credenciales de LucidSales (email, password, shop_id)');
  }
  return config;
}

async function authenticate(config) {
  if (tokenCache && tokenExpires && Date.now() < tokenExpires.getTime()) {
    return { token: tokenCache, shopId: shopIdCache };
  }

  if (config.lucidsales_token && config.lucidsales_token_expires && new Date(config.lucidsales_token_expires) > new Date()) {
    tokenCache = config.lucidsales_token;
    tokenExpires = new Date(config.lucidsales_token_expires);
    shopIdCache = config.lucidsales_shop_id;
    return { token: tokenCache, shopId: shopIdCache };
  }

  console.log('[LucidSales] Autenticando con email:', config.lucidsales_email, 'shopId:', config.lucidsales_shop_id);

  const loginResp = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.lucidsales_email, password: config.lucidsales_password })
  });
  const loginRaw = await loginResp.text();
  let loginData;
  try { loginData = JSON.parse(loginRaw); } catch { loginData = { ok: false, error: 'Respuesta no JSON: ' + loginRaw.slice(0, 200) }; }
  console.log('[LucidSales] Login response status:', loginResp.status, 'ok:', loginData.ok);

  if (!loginData.ok || !loginData.token) {
    throw new Error(`Login LucidSales fallido (${loginResp.status}): ${JSON.stringify(loginData)}`);
  }

  const shopResp = await fetch(`${BASE_URL}/auth/addShopId`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-token': loginData.token
    },
    body: JSON.stringify({ id: config.lucidsales_shop_id })
  });
  const shopRaw = await shopResp.text();
  let shopData;
  try { shopData = JSON.parse(shopRaw); } catch { shopData = { ok: false, error: 'Respuesta no JSON: ' + shopRaw.slice(0, 200) }; }
  console.log('[LucidSales] addShopId response status:', shopResp.status, 'ok:', shopData.ok);

  if (!shopData.ok || !shopData.token) {
    throw new Error(`Activación tienda LucidSales fallida (${shopResp.status}): ${JSON.stringify(shopData)}`);
  }

  const expiresAt = new Date(Date.now() + 7 * 60 * 60 * 1000);

  await prisma.configuracion.update({
    where: { id: config.id },
    data: {
      lucidsales_token: shopData.token,
      lucidsales_token_expires: expiresAt
    }
  });

  tokenCache = shopData.token;
  tokenExpires = expiresAt;
  shopIdCache = config.lucidsales_shop_id;

  return { token: shopData.token, shopId: config.lucidsales_shop_id };
}

async function apiGet(path, token) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-token': token }
  });
  return resp.json();
}

async function apiPost(path, body, token) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-token': token
    },
    body: JSON.stringify(body)
  });
  return resp.json();
}

async function getPedidos({ page = 1, itemsPerPage = 50, search = '', filters = '[]' } = {}) {
  const config = await getConfig();
  const { token, shopId } = await authenticate(config);
  const params = new URLSearchParams({
    idEmpresa: String(shopId),
    page: String(page),
    itemsPerPage: String(itemsPerPage),
    search,
    filters
  });
  return apiGet(`/pedidos/get-pedidos-light-data?${params.toString()}`, token);
}

async function getPedidoById(id) {
  const config = await getConfig();
  const { token } = await authenticate(config);
  return apiGet(`/pedidos/get-pedido-by-id/${id}`, token);
}

async function updatePedido(pedido) {
  const config = await getConfig();
  const { token } = await authenticate(config);

  const body = {
    id: Number(pedido.id),
    idPedido: Number(pedido.idPedido),
    idEmpresa: Number(pedido.idEmpresa),
    Nombre: pedido.Nombre || '',
    Apellido: pedido.Apellido || '',
    NIT: pedido.NIT || '',
    Correo: pedido.Correo || '',
    Movil: pedido.Movil || '',
    Direccion: pedido.Direccion || '',
    verifiedAddress: pedido.verifiedAddress || '',
    Pais: Number(pedido.Pais),
    codigoPostal: pedido.codigoPostal || '',
    Departamento: Number(pedido.Departamento),
    Ciudad: Number(pedido.Ciudad),
    Observaciones: typeof pedido.Observaciones === 'string' ? pedido.Observaciones : JSON.stringify(pedido.Observaciones || []),
    EstadoPedido: Number(pedido.EstadoPedido),
    Json: typeof pedido.Json === 'string' ? pedido.Json : JSON.stringify(pedido.Json || []),
    SubTotal: String(pedido.SubTotal || '0.00'),
    CostoEnvio: String(pedido.CostoEnvio || '0.00'),
    Total: String(pedido.Total || '0.00'),
    TipoPago: Number(pedido.TipoPago ?? 1),
    EstadoPago: Number(pedido.EstadoPago ?? 0),
    logistic: pedido.logistic || '',
    Referencias: pedido.Referencias || ''
  };

  return apiPost('/pedidos/update', body, token);
}

async function createPedido(pedido) {
  const config = await getConfig();
  const { token, shopId } = await authenticate(config);

  const body = {
    idEmpresa: shopId,
    nombreCliente: pedido.nombreCliente || '',
    apellidoCliente: pedido.apellidoCliente || '',
    emailCliente: pedido.emailCliente || '',
    telefonoCliente: pedido.telefonoCliente || '',
    direccionCliente: pedido.direccionCliente || '',
    ciudadCliente: Number(pedido.ciudadCliente),
    departamentoCliente: Number(pedido.departamentoCliente),
    paisCliente: Number(pedido.paisCliente || 47),
    codigoPostal: pedido.codigoPostal || null,
    nitCliente: pedido.nitCliente || '',
    json: typeof pedido.json === 'string' ? pedido.json : JSON.stringify(pedido.json || []),
    subTotal: Number(pedido.subTotal || 0),
    costoEnvio: Number(pedido.costoEnvio || 0),
    total: Number(pedido.total || 0),
    Referencias: pedido.Referencias || ''
  };

  return apiPost('/pedidos/create', body, token);
}

async function cotizarEnvio(pedidoId, carrier = 'dropi') {
  const config = await getConfig();
  const { token } = await authenticate(config);

  const pedido = await apiGet(`/pedidos/get-pedido-by-id/${pedidoId}`, token);
  if (!pedido || !pedido.id) {
    throw new Error('Pedido no encontrado');
  }

  return apiPost(`/pedidos/quote/${carrier}`, {
    id: pedido.id,
    idPedido: pedido.idPedido
  }, token);
}

async function confirmarIntegracion(pedidoId, carrier = 'rocket') {
  const config = await getConfig();
  const { token } = await authenticate(config);

  const pedido = await apiGet(`/pedidos/get-pedido-by-id/${pedidoId}`, token);
  if (!pedido || !pedido.id) {
    throw new Error('Pedido no encontrado');
  }

  return apiPost(`/pedidos/integrations/confirm/${carrier}`, {
    id: pedido.id,
    idPedido: pedido.idPedido
  }, token);
}

async function uploadToHoko(pedidoId) {
  const config = await getConfig();
  const { token } = await authenticate(config);

  const pedido = await apiGet(`/pedidos/get-pedido-by-id/${pedidoId}`, token);
  if (!pedido || !pedido.id) {
    throw new Error('Pedido no encontrado');
  }

  return apiPost(`/pedidos/upload/hoko`, {
    id: pedido.id,
    idPedido: pedido.idPedido
  }, token);
}

async function validateAddress(direccion, ciudad, departamento, pais = 47) {
  const config = await getConfig();
  const { token } = await authenticate(config);
  return apiPost('/pedidos/validate-address', {
    direccion,
    ciudad: String(ciudad),
    departamento: String(departamento),
    pais: String(pais)
  }, token);
}

async function getFiltersData() {
  const config = await getConfig();
  const { token, shopId } = await authenticate(config);
  return apiGet(`/pedidos/get-filters-data?idEmpresa=${shopId}`, token);
}

async function getPaises() {
  const resp = await fetch(`${BASE_URL}/tools/getCountries`);
  return resp.json();
}

async function getDepartamentos(paisId = 47) {
  const resp = await fetch(`${BASE_URL}/tools/getCountryState?country=${paisId}`);
  return resp.json();
}

async function getCiudades(deptoId) {
  const resp = await fetch(`${BASE_URL}/tools/getStateCity?state=${deptoId}`);
  return resp.json();
}

async function verificarConexion() {
  try {
    const config = await getConfig();
    await authenticate(config);
    const { token, shopId } = await authenticate(config);
    const result = await apiGet('/pedidos/get-filters-data?idEmpresa=' + shopId, token);
    return { conectado: true, mensaje: 'Conexión exitosa con LucidSales' };
  } catch (error) {
    return { conectado: false, mensaje: error.message };
  }
}

function clearTokenCache() {
  tokenCache = null;
  tokenExpires = null;
  shopIdCache = null;
}

function getCiudadesLocales(deptoId) {
  try {
    const ciudades = require('../data/lucidsales_ciudades.json');
    if (deptoId !== undefined) {
      return ciudades.filter(c => c.state_id === deptoId);
    }
    return ciudades;
  } catch {
    return [];
  }
}

function getDepartamentosLocales() {
  try {
    const ciudades = require('../data/lucidsales_ciudades.json');
    const deptos = {};
    for (const c of ciudades) {
      if (c.state_id && !deptos[c.state_id]) {
        deptos[c.state_id] = { id: c.state_id, ciudades: 0 };
      }
      if (c.state_id) deptos[c.state_id].ciudades++;
    }
    return Object.values(deptos);
  } catch {
    return [];
  }
}

module.exports = {
  getPedidos,
  getPedidoById,
  updatePedido,
  createPedido,
  cotizarEnvio,
  confirmarIntegracion,
  uploadToHoko,
  validateAddress,
  getFiltersData,
  getPaises,
  getDepartamentos,
  getCiudades,
  verificarConexion,
  clearTokenCache,
  getCiudadesLocales,
  getDepartamentosLocales
};
