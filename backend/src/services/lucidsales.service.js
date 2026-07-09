const { prisma } = require('../prisma/client');

const BASE_URL = 'https://panel.lucidsales.co/b';
const FETCH_TIMEOUT_MS = 30_000;

let tokenCache = null;
let tokenExpires = null;
let shopIdCache = null;
let authPromise = null;

function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function getConfig() {
  const config = await prisma.configuracion.findFirst();
  if (!config || !config.lucidsales_activo) {
    throw new Error('LucidSales no esta configurado o activo');
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

  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    try {
      console.log('[LucidSales] Autenticando...');

      const loginResp = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: config.lucidsales_email, password: config.lucidsales_password })
      });
      const loginRaw = await loginResp.text();
      let loginData;
      try { loginData = JSON.parse(loginRaw); } catch { loginData = { ok: false, error: 'Respuesta no JSON: ' + loginRaw.slice(0, 200) }; }
      console.log('[LucidSales] Login status:', loginResp.status);

      if (!loginData.ok || !loginData.token) {
        throw new Error(`Login LucidSales fallido (${loginResp.status}): ${JSON.stringify(loginData)}`);
      }

      const shopResp = await fetchWithTimeout(`${BASE_URL}/auth/addShopId`, {
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
      console.log('[LucidSales] addShopId status:', shopResp.status);

      if (!shopData.ok || !shopData.token) {
        throw new Error(`Activacion tienda LucidSales fallida (${shopResp.status}): ${JSON.stringify(shopData)}`);
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
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

async function apiGet(path, token) {
  const url = `${BASE_URL}${path}`;
  console.log(`[LucidSales] GET ${url}`);
  try {
    const resp = await fetchWithTimeout(url, { headers: { 'x-token': token } });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || data.msg || `HTTP ${resp.status}: ${resp.statusText}`);
    }
    return data;
  } catch (error) {
    console.error(`[LucidSales] apiGet FAIL ${url}:`, error.message);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout llamando a LucidSales: ${url}`);
    }
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      throw new Error(`No se pudo conectar a LucidSales (panel.lucidsales.co). Verifica conexion a internet.`);
    }
    throw error;
  }
}

async function apiPost(path, body, token) {
  const url = `${BASE_URL}${path}`;
  console.log(`[LucidSales] POST ${url}`);
  try {
    const resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-token': token },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || data.msg || `HTTP ${resp.status}: ${resp.statusText}`);
    }
    return data;
  } catch (error) {
    console.error(`[LucidSales] apiPost FAIL ${url}:`, error.message);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout llamando a LucidSales: ${url}`);
    }
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      throw new Error(`No se pudo conectar a LucidSales (panel.lucidsales.co). Verifica conexion a internet.`);
    }
    throw error;
  }
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
  const result = await apiGet(`/pedidos/get-pedido-by-id/${id}`, token);
  const pedido = result.pedido || result;
  if (!pedido || !pedido.id) {
    throw new Error('Pedido no encontrado o respuesta inválida de LucidSales');
  }
  return pedido;
}

async function updatePedido(pedido) {
  const config = await getConfig();
  const { token, shopId } = await authenticate(config);

  const body = {
    id: Number(pedido.id),
    idPedido: Number(pedido.idPedido),
    idEmpresa: Number(shopId),
    Nombre: pedido.Nombre || '',
    Apellido: pedido.Apellido || '',
    NIT: pedido.NIT || '',
    Correo: pedido.Correo || '',
    Movil: pedido.Movil || '',
    Direccion: pedido.Direccion || '',
    verifiedAddress: pedido.verifiedAddress || '',
    Pais: Number(pedido.Pais ?? 47),
    codigoPostal: pedido.codigoPostal || '',
    Departamento: Number(pedido.Departamento ?? 0),
    Ciudad: Number(pedido.Ciudad ?? 0),
    Observaciones: typeof pedido.Observaciones === 'string' ? pedido.Observaciones : JSON.stringify(pedido.Observaciones || []),
    EstadoPedido: Number(pedido.EstadoPedido ?? 0),
    Json: typeof pedido.Json === 'string' ? pedido.Json : JSON.stringify(pedido.Json || []),
    SubTotal: Number(pedido.SubTotal || 0).toFixed(2),
    CostoEnvio: Number(pedido.CostoEnvio || 0).toFixed(2),
    Total: Number(pedido.Total || 0).toFixed(2),
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
    ciudadCliente: Number(pedido.ciudadCliente ?? 0),
    departamentoCliente: Number(pedido.departamentoCliente ?? 0),
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

  const pedido = await getPedidoById(pedidoId);

  return apiPost(`/pedidos/quote/${carrier}`, {
    id: pedido.id,
    direccion: pedido.Direccion || '',
    tipoPago: Number(pedido.TipoPago ?? 1),
    ciudad: Number(pedido.Ciudad ?? 0),
    departamento: Number(pedido.Departamento ?? 0),
    referencias: pedido.Referencias || ''
  }, token);
}

async function confirmarIntegracion(pedidoId, transportadora_id) {
  const config = await getConfig();
  const { token } = await authenticate(config);

  const body = { id: pedidoId };
  if (transportadora_id != null) {
    body.transportadora_id = Number(transportadora_id);
  }

  console.log(`[LucidSales] confirmarIntegracion: POST /pedidos/upload/dropi body:`, JSON.stringify(body));
  return apiPost('/pedidos/upload/dropi', body, token);
}

async function uploadToHoko(pedidoId) {
  const config = await getConfig();
  const { token } = await authenticate(config);

  const pedido = await getPedidoById(pedidoId);

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

async function getProductos() {
  const config = await getConfig();
  const { token, shopId } = await authenticate(config);
  return apiPost('/productos/getproductos', { idEmpresa: shopId }, token);
}

async function getProductoIndividual(productoId) {
  const config = await getConfig();
  const { token } = await authenticate(config);
  return apiGet(`/productos/getproducto/${productoId}`, token);
}

async function validateDropiId(dropiProductId) {
  const config = await getConfig();
  const { token } = await authenticate(config);
  return apiGet(`/productos/validateDropiId/${dropiProductId}`, token);
}

async function getFiltersData() {
  const config = await getConfig();
  const { token, shopId } = await authenticate(config);
  return apiGet(`/pedidos/get-filters-data?idEmpresa=${shopId}`, token);
}

async function getPaises() {
  const resp = await fetchWithTimeout(`${BASE_URL}/tools/getCountries`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Error obteniendo países (${resp.status})`);
  return data;
}

async function getDepartamentos(paisId = 47) {
  const resp = await fetchWithTimeout(`${BASE_URL}/tools/getCountryState?country=${paisId}`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Error obteniendo departamentos (${resp.status})`);
  return data;
}

async function getCiudades(deptoId) {
  const resp = await fetchWithTimeout(`${BASE_URL}/tools/getStateCity?state=${deptoId}`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Error obteniendo ciudades (${resp.status})`);
  return data;
}

async function verificarConexion() {
  try {
    const config = await getConfig();
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
    if (deptoId !== undefined && deptoId !== null) {
      return ciudades.filter(c => c.state_id === Number(deptoId));
    }
    return ciudades;
  } catch (error) {
    console.error('[LucidSales] Error cargando ciudades locales:', error);
    return [];
  }
}

function getDepartamentosLocales() {
  try {
    return require('../data/lucidsales_departamentos.json');
  } catch (error) {
    console.error('[LucidSales] Error cargando departamentos locales:', error);
    return [];
  }
}

async function crearVinculacionDirecta(lucidsalesPedidoId, pedidoData, notas, usuarioId, asignadoId) {
  const data = {
    lucidsalesIdPedido: pedidoData.idPedido || null,
    nombreCliente: pedidoData.Nombre || '',
    apellidoCliente: pedidoData.Apellido || '',
    movil: pedidoData.Movil || '',
    total: pedidoData.Total || '0',
    estadoPedido: pedidoData.EstadoPedido ?? 0,
    referencias: pedidoData.Referencias || '',
    jsonProductos: typeof pedidoData.Json === 'string' ? pedidoData.Json : JSON.stringify(pedidoData.Json || []),
    conversacionLink: pedidoData.botInbox || pedidoData.conversacionLink || pedidoData.ConversacionLink || pedidoData.linkConversacion || null,
    notas: notas || null,
    createdById: usuarioId || null,
    asignadoId: asignadoId || null
  };
  return prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: data,
    create: { lucidsalesPedidoId: Number(lucidsalesPedidoId), ...data }
  });
}

async function crearVinculacion(lucidsalesPedidoId, notas, usuarioId, asignadoId) {
  const pedido = await getPedidoById(lucidsalesPedidoId);
  const data = {
    lucidsalesIdPedido: pedido.idPedido || null,
    nombreCliente: pedido.Nombre || '',
    apellidoCliente: pedido.Apellido || '',
    movil: pedido.Movil || '',
    total: pedido.Total || '0',
    estadoPedido: pedido.EstadoPedido ?? 0,
    referencias: pedido.Referencias || '',
    jsonProductos: typeof pedido.Json === 'string' ? pedido.Json : JSON.stringify(pedido.Json || []),
    conversacionLink: pedido.botInbox || pedido.conversacionLink || pedido.ConversacionLink || pedido.linkConversacion || null,
    notas: notas || null,
    createdById: usuarioId || null,
    asignadoId: asignadoId || null
  };
  return prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: data,
    create: { lucidsalesPedidoId: Number(lucidsalesPedidoId), ...data }
  });
}

async function guardarVinculacionLocal(lucidsalesPedidoId, pedido, usuarioId, asignadoId) {
  const data = {
    lucidsalesIdPedido: Number(pedido.idPedido ?? lucidsalesPedidoId),
    nombreCliente: pedido.Nombre || '',
    apellidoCliente: pedido.Apellido || '',
    movil: pedido.Movil || '',
    total: String(pedido.Total || '0'),
    estadoPedido: Number(pedido.EstadoPedido ?? 0),
    referencias: pedido.Referencias || '',
    jsonProductos: typeof pedido.Json === 'string' ? pedido.Json : JSON.stringify(pedido.Json || []),
    conversacionLink: pedido.conversacionLink || pedido.ConversacionLink || pedido.linkConversacion || null,
    notas: pedido.notas || null,
    asignadoId: asignadoId || null
  };
  if (usuarioId && !data.createdById) {
    data.createdById = usuarioId;
  }
  return prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: data,
    create: { lucidsalesPedidoId: Number(lucidsalesPedidoId), ...data }
  });
}

async function listVinculaciones({ page = 1, itemsPerPage = 50, search = '', estadoFilter, asignadoId, lucidsalesPedidoIds } = {}) {
  const where = {};
  if (search) {
    where.OR = [
      { nombreCliente: { contains: search } },
      { apellidoCliente: { contains: search } },
      { movil: { contains: search } },
      { referencias: { contains: search } },
    ];
  }
  if (estadoFilter !== undefined && estadoFilter !== '' && estadoFilter !== null) {
    where.estadoPedido = Number(estadoFilter);
  }
  if (asignadoId) {
    where.asignadoId = asignadoId;
  }
  if (lucidsalesPedidoIds) {
    where.lucidsalesPedidoId = { in: lucidsalesPedidoIds };
  }

  const [total, pedidos] = await Promise.all([
    prisma.pedidoVinculado.count({ where }),
    prisma.pedidoVinculado.findMany({
      where,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
      include: {
        asignado: { select: { id: true, nombre: true } },
        createdBy: { select: { id: true, nombre: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const ids = pedidos.map(p => String(p.lucidsalesPedidoId));
  const tagsPorId = {};
  if (ids.length > 0) {
    const todas = await prisma.registroEtiqueta.findMany({
      where: { registroId: { in: ids }, tabla: 'pedidos_vinculados' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });
    todas.forEach(t => {
      if (!tagsPorId[t.registroId]) tagsPorId[t.registroId] = [];
      tagsPorId[t.registroId].push(t.etiqueta);
    });
  }

  return {
    ok: true,
    pedidos: pedidos.map(p => ({
      id: p.lucidsalesPedidoId,
      idPedido: p.lucidsalesIdPedido || p.lucidsalesPedidoId,
      Nombre: p.nombreCliente || '',
      Apellido: p.apellidoCliente || '',
      Movil: p.movil || '',
      Total: p.total || '0',
      EstadoPedido: p.estadoPedido ?? 0,
      Referencias: p.referencias || '',
      conversacionLink: p.conversacionLink || null,
      Json: p.jsonProductos || '[]',
      asignado: p.asignado || null,
      creador: p.createdBy || null,
      _etiquetas: tagsPorId[String(p.lucidsalesPedidoId)] || []
    })),
    totalRecords: total,
    numPages: Math.ceil(total / itemsPerPage)
  };
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
  getProductos,
  getProductoIndividual,
  validateDropiId,
  getCiudadesLocales,
  getDepartamentosLocales,
  crearVinculacion,
  crearVinculacionDirecta,
  guardarVinculacionLocal,
  listVinculaciones
};
