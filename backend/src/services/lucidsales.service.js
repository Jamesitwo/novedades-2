const { prisma } = require('../prisma/client');
const { cached } = require('../utils/cache');
const asignacionPedidosService = require('./asignacion-pedidos.service');

const BASE_URL = 'https://panel.lucidsales.co/b';
const FETCH_TIMEOUT_MS = 30_000;

const CACHE_PRODUCTOS_MS = 5 * 60 * 1000;
const CACHE_DROPI_MS = 15 * 60 * 1000;

const authByTienda = new Map();

function fetchWithTimeout(url, options = {}) {
  const ms = options.timeout || FETCH_TIMEOUT_MS;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
  } catch {
    return fetch(url, options);
  }
}

async function getConfig(tiendaId) {
  let tid = tiendaId;
  if (!tid) {
    const { resolveTiendaId } = require('../utils/tienda');
    tid = await resolveTiendaId('pizdo');
  }
  const config = await prisma.configuracion.findFirst({ where: { tiendaId: tid } });
  if (!config || !config.lucidsales_activo) {
    throw new Error('LucidSales no esta configurado o activo para esta tienda');
  }
  if (!config.lucidsales_email || !config.lucidsales_password || !config.lucidsales_shop_id) {
    throw new Error('Faltan credenciales de LucidSales (email, password, shop_id)');
  }
  return config;
}

async function authenticate(config) {
  const tid = config.tiendaId || config.id;
  const entry = authByTienda.get(tid);

  if (entry && entry.tokenExpires && Date.now() < entry.tokenExpires.getTime()) {
    return { token: entry.token, shopId: entry.shopId };
  }

  if (config.lucidsales_token && config.lucidsales_token_expires && new Date(config.lucidsales_token_expires) > new Date()) {
    authByTienda.set(tid, {
      token: config.lucidsales_token,
      tokenExpires: new Date(config.lucidsales_token_expires),
      shopId: config.lucidsales_shop_id
    });
    return { token: config.lucidsales_token, shopId: config.lucidsales_shop_id };
  }

  if (entry?.promise) {
    return entry.promise;
  }

  const promise = (async () => {
    try {
      const loginResp = await fetchWithTimeout(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: config.lucidsales_email, password: config.lucidsales_password })
      });
      const loginRaw = await loginResp.text();
      let loginData;
      try { loginData = JSON.parse(loginRaw); } catch { loginData = { ok: false, error: 'Respuesta no JSON: ' + loginRaw.slice(0, 200) }; }

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

      authByTienda.set(tid, { token: shopData.token, tokenExpires: expiresAt, shopId: config.lucidsales_shop_id });

      return { token: shopData.token, shopId: config.lucidsales_shop_id };
    } finally {
      const current = authByTienda.get(tid);
      if (current) {
        current.promise = null;
        authByTienda.set(tid, current);
      }
    }
  })();

  authByTienda.set(tid, { ...(entry || {}), promise });
  return promise;
}

function extraerMensajeError(data, fallback) {
  const crudo = data?.msg || data?.error || data?.message || data?.mensaje;
  if (typeof crudo === 'string' && crudo.trim()) return crudo;
  if (crudo !== undefined && crudo !== null) {
    try { return JSON.stringify(crudo); } catch { return String(crudo); }
  }
  return fallback;
}

function crearErrorLucidSales(data, fallback, status) {
  const mensaje = extraerMensajeError(data, fallback);
  const err = new Error(mensaje);
  err.datos = data;
  err.status = status;
  return err;
}

async function apiGet(path, token) {
  const url = `${BASE_URL}${path}`;
  try {
    const resp = await fetchWithTimeout(url, { headers: { 'x-token': token } });
    const rawText = await resp.text();
    let data = null;
    try { data = JSON.parse(rawText); } catch { data = null; }
    if (!resp.ok) {
      if (data === null) {
        const err = new Error(`HTTP ${resp.status}: ${rawText.slice(0, 500)}`);
        err.datos = { raw: rawText.slice(0, 2000), status: resp.status };
        throw err;
      }
      throw crearErrorLucidSales(data, `HTTP ${resp.status}: ${resp.statusText}`, resp.status);
    }
    if (data && data.ok === false) {
      throw crearErrorLucidSales(data, 'LucidSales rechazo la solicitud', resp.status);
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
  try {
    const resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-token': token },
      body: JSON.stringify(body)
    });
    const rawText = await resp.text();
    let data = null;
    try { data = JSON.parse(rawText); } catch { data = null; }
    if (!resp.ok) {
      if (data === null) {
        const err = new Error(`HTTP ${resp.status}: ${rawText.slice(0, 500)}`);
        err.datos = { raw: rawText.slice(0, 2000), status: resp.status };
        throw err;
      }
      throw crearErrorLucidSales(data, `HTTP ${resp.status}: ${resp.statusText}`, resp.status);
    }
    if (data && data.ok === false) {
      throw crearErrorLucidSales(data, 'LucidSales rechazo la solicitud', resp.status);
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

async function getPedidos({ page = 1, itemsPerPage = 50, search = '', filters = '[]', tiendaId = null } = {}) {
  const config = await getConfig(tiendaId);
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

async function getPedidoById(id, tiendaId = null) {
  const config = await getConfig(tiendaId);
  const { token } = await authenticate(config);
  const result = await apiGet(`/pedidos/get-pedido-by-id/${id}`, token);
  const pedido = result.pedido || result;
  if (!pedido || !pedido.id) {
    throw new Error('Pedido no encontrado o respuesta inválida de LucidSales');
  }
  return pedido;
}

async function updatePedido(pedido, tiendaId = null) {
  const config = await getConfig(tiendaId);
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

async function createPedido(pedido, tiendaId = null) {
  const config = await getConfig(tiendaId);
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

async function cotizarEnvio(pedidoId, carrier = 'dropi', tiendaId = null) {
  const config = await getConfig(tiendaId);
  const { token } = await authenticate(config);

  const pedido = await getPedidoById(pedidoId, tiendaId);

  return apiPost(`/pedidos/quote/${carrier}`, {
    id: pedido.id,
    direccion: pedido.Direccion || '',
    tipoPago: Number(pedido.TipoPago ?? 1),
    ciudad: Number(pedido.Ciudad ?? 0),
    departamento: Number(pedido.Departamento ?? 0),
    referencias: pedido.Referencias || ''
  }, token);
}

async function confirmarIntegracion(pedidoId, transportadora_id, _extra = {}, tiendaId = null) {
  const config = await getConfig(tiendaId);
  const { token } = await authenticate(config);

  const body = { id: pedidoId };
  if (transportadora_id != null) {
    body.transportadora_id = Number(transportadora_id);
  }

  console.log(`[LucidSales] confirmarIntegracion: POST /pedidos/upload/dropi body:`, JSON.stringify(body));
  try {
    return await apiPost('/pedidos/upload/dropi', body, token);
  } catch (error) {
    console.error('[LucidSales] upload/dropi FAIL body:', error.datos ? JSON.stringify(error.datos).slice(0, 2000) : error.message);
    throw error;
  }
}

async function validateAddress(direccion, ciudad, departamento, pais = 47, tiendaId = null) {
  const config = await getConfig(tiendaId);
  const { token } = await authenticate(config);
  return apiPost('/pedidos/validate-address', {
    direccion,
    ciudad: String(ciudad),
    departamento: String(departamento),
    pais: String(pais)
  }, token);
}

const getProductos = cached(async (tiendaId) => {
  const config = await getConfig(tiendaId);
  const { token, shopId } = await authenticate(config);
  return apiPost('/productos/getproductos', { idEmpresa: shopId }, token);
}, CACHE_PRODUCTOS_MS, (id) => `prod_${id || 'default'}`);

// Producto individual (lo que el agente de Dropi llama `obtenerProducto`).
// Devuelve el objeto producto ya desenvuelto.
const getProducto = cached(async (productoId, tiendaId) => {
  const config = await getConfig(tiendaId);
  const { token } = await authenticate(config);
  const r = await apiGet(`/productos/getproducto/${productoId}`, token);
  const p = r?.datos?.product ?? r?.datos?.producto ?? r?.datos?.data?.product ?? r?.datos?.data ?? r?.datos ?? r;
  if (!p || !p.id) throw new Error('Producto no encontrado o respuesta inválida de LucidSales');
  return p;
}, CACHE_PRODUCTOS_MS, (id, tienda) => `prod1_${id}_${tienda || 'default'}`);

const validateDropiId = cached(async (dropiProductId, tiendaId) => {
  const config = await getConfig(tiendaId);
  const { token } = await authenticate(config);
  return apiGet(`/productos/validateDropiId/${dropiProductId}`, token);
}, CACHE_DROPI_MS, (id) => `dropi_${id}`);

async function getFiltersData(tiendaId = null) {
  const config = await getConfig(tiendaId);
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

async function verificarConexion(tiendaId = null) {
  try {
    const config = await getConfig(tiendaId);
    const { token, shopId } = await authenticate(config);
    await apiGet('/pedidos/get-filters-data?idEmpresa=' + shopId, token);
    return { conectado: true, mensaje: 'Conexión exitosa con LucidSales' };
  } catch (error) {
    return { conectado: false, mensaje: error.message };
  }
}

function clearTokenCache() {
  authByTienda.clear();
  const { clearCache } = require('../utils/cache');
  clearCache();
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

// Mantiene la tabla propia de asignaciones al dia cuando un camino legacy
// (vincular, duplicar, subir-dividido) fija el dueno en pedidos_vinculados.
// Si asignadoId es undefined no se toca nada (el caller no esta asignando).
async function _syncAsignacionPropia(lucidsalesPedidoId, asignadoId, tiendaId, usuarioId, origen = 'legacy') {
  if (asignadoId === undefined || asignadoId === null) return;
  try {
    await asignacionPedidosService.asignar(Number(lucidsalesPedidoId), asignadoId, {
      tiendaId: tiendaId || null,
      createdById: usuarioId || null,
      origen
    });
  } catch (e) {
    console.warn('[Asignacion] No se pudo sincronizar tabla propia:', e.message);
  }
}

async function crearVinculacionDirecta(lucidsalesPedidoId, pedidoData, notas, usuarioId, asignadoId, tiendaId = null) {
  const baseData = {
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
    tiendaId
  };
  const updateData = asignadoId ? { ...baseData, asignadoId } : { ...baseData };
  const createData = { ...baseData, asignadoId: asignadoId || null };
  const resultado = await prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: updateData,
    create: { lucidsalesPedidoId: Number(lucidsalesPedidoId), ...createData }
  });
  await _syncAsignacionPropia(lucidsalesPedidoId, asignadoId, tiendaId, usuarioId);
  return resultado;
}

async function crearVinculacion(lucidsalesPedidoId, notas, usuarioId, asignadoId, tiendaId = null) {
  const pedido = await getPedidoById(lucidsalesPedidoId, tiendaId);
  const baseData = {
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
    tiendaId
  };
  const updateData = asignadoId ? { ...baseData, asignadoId } : { ...baseData };
  const createData = { ...baseData, asignadoId: asignadoId || null };
  const resultado = await prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: updateData,
    create: { lucidsalesPedidoId: Number(lucidsalesPedidoId), ...createData }
  });
  await _syncAsignacionPropia(lucidsalesPedidoId, asignadoId, tiendaId, usuarioId);
  return resultado;
}

async function guardarVinculacionLocal(lucidsalesPedidoId, pedido, usuarioId, asignadoId, tiendaId = null) {
  const baseData = {
    lucidsalesIdPedido: Number(pedido.idPedido ?? lucidsalesPedidoId),
    nombreCliente: pedido.Nombre || '',
    apellidoCliente: pedido.Apellido || '',
    movil: pedido.Movil || '',
    total: String(pedido.Total || '0'),
    estadoPedido: Number(pedido.EstadoPedido ?? 0),
    referencias: pedido.Referencias || '',
    jsonProductos: typeof pedido.Json === 'string' ? pedido.Json : JSON.stringify(pedido.Json || []),
    conversacionLink: pedido.conversacionLink || pedido.ConversacionLink || pedido.linkConversacion || null,
    notas: pedido.notas !== undefined && pedido.notas !== null ? pedido.notas : undefined
  };
  if (usuarioId && !baseData.createdById) {
    baseData.createdById = usuarioId;
  }
  if (tiendaId && !baseData.tiendaId) {
    baseData.tiendaId = tiendaId;
  }
  const updateData = asignadoId ? { ...baseData, asignadoId } : { ...baseData };
  const createData = { ...baseData, asignadoId: asignadoId || null };
  const resultado = await prisma.pedidoVinculado.upsert({
    where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
    update: updateData,
    create: { lucidsalesPedidoId: Number(lucidsalesPedidoId), ...createData }
  });
  await _syncAsignacionPropia(lucidsalesPedidoId, asignadoId, baseData.tiendaId || tiendaId, usuarioId);
  return resultado;
}

async function listVinculaciones({ page = 1, itemsPerPage = 50, search = '', estadoFilter, estados, asignadoId, lucidsalesPedidoIds, fechaDesde, fechaHasta, producto, tiendaId } = {}) {
  const where = {};
  if (tiendaId) where.tiendaId = tiendaId;
  if (search) {
    where.OR = [
      { nombreCliente: { contains: search } },
      { apellidoCliente: { contains: search } },
      { movil: { contains: search } },
      { referencias: { contains: search } },
    ];
  }
  if (Array.isArray(estados) && estados.length > 0) {
    where.estadoPedido = { in: estados };
  } else if (estadoFilter !== undefined && estadoFilter !== '' && estadoFilter !== null) {
    where.estadoPedido = Number(estadoFilter);
  }
  if (asignadoId) {
    where.asignadoId = asignadoId;
  }
  if (lucidsalesPedidoIds) {
    where.lucidsalesPedidoId = { in: lucidsalesPedidoIds };
  }
  if (fechaDesde || fechaHasta) {
    where.createdAt = {};
    if (fechaDesde) where.createdAt.gte = new Date(fechaDesde + 'T00:00:00');
    if (fechaHasta) where.createdAt.lte = new Date(fechaHasta + 'T23:59:59');
  }
  if (producto) {
    where.jsonProductos = { contains: producto };
  }

  const [total, pedidos] = await Promise.all([
    prisma.pedidoVinculado.count({ where }),
    prisma.pedidoVinculado.findMany({
      where,
      skip: (page - 1) * itemsPerPage,
      take: itemsPerPage,
      include: {
        asignado: { select: { id: true, nombre: true } },
        createdBy: { select: { id: true, nombre: true } },
        subidoPor: { select: { id: true, nombre: true } }
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
      notas: p.notas || null,
      Json: p.jsonProductos || '[]',
      asignado: p.asignado || null,
      creador: p.createdBy || null,
      subidoPor: p.subidoPor || null,
      createdAt: p.createdAt,
      _etiquetas: tagsPorId[String(p.lucidsalesPedidoId)] || []
    })),
    totalRecords: total,
    numPages: Math.ceil(total / itemsPerPage)
  };
}

// Nombres de estado que acepta el filtro orderStatus de LucidSales (sin acentos, como en el panel oficial)
const NOMBRES_ESTADO_LS = {
  0: 'Por confirmar',
  1: 'Cancelado',
  2: 'Confirmado',
  3: 'Modificado',
  4: 'En Transito',
  5: 'En Reparto',
  6: 'Entregado',
  7: 'Devuelto',
  8: 'En Novedad',
  9: 'Novedad Solucionada'
};

// ---------------------------------------------------------------------------
// Lista de pedidos LLAMANDO DIRECTO a la API de LucidSales.
//
// La API manda en los datos del pedido (cliente, total, estado, productos).
// La base de Pizdo es una capa propia unida por el id de LucidSales:
// asignacion (asignaciones_pedido), etiquetas, notas, quien lo subio, y la
// vinculacion (pedidos_vinculados) que usan Novedades, Oficina y las metricas.
//
// Dos caminos:
//   * normal: la pagina sale de la API (filtros de estado/fecha/producto/
//     busqueda los aplica LucidSales) y se le une lo local.
//   * "asignados a X" / "con etiqueta Y": esos datos solo estan en Pizdo, asi
//     que los ids salen de la base, se paginan aqui y cada pedido de la pagina
//     se lee en vivo de la API. Asi un operador con "ver solo asignados" ve
//     TODOS sus pedidos y el total cuadra (no solo los de la pagina cargada).
// En ambos caminos se refresca la copia (estado/total) que guarda la base,
// que es de donde leen las metricas.
// ---------------------------------------------------------------------------

const CONCURRENCIA_VIVO = 6;
// estados que ya no cambian: su copia local siempre vale
const ESTADOS_FINALES = new Set([1, 6, 7]);
// una copia de estado mas nueva que esto vale para prefiltrar
const COPIA_FRESCA_MS = 3 * 24 * 3600 * 1000;
const calentando = new Set();
// filtros que se miran en vivo: tandas y tope de lecturas por peticion
const TANDA_ESCANEO = 24;
const MAX_ESCANEO = 360;

/** Refresca en segundo plano la copia de unos pedidos (de a 3, sin repetir). */
function calentarCopias(ids, tiendaId) {
  const nuevos = ids.filter(id => !calentando.has(id));
  if (!nuevos.length) return;
  nuevos.forEach(id => calentando.add(id));
  (async () => {
    const vivos = await mapLimitado(nuevos, 3, id => pedidoEnVivo(id, tiendaId));
    const ok = vivos.filter(v => v && !v.__error && v.id);
    if (ok.length) refrescarCopias(ok, await datosLocales(ok.map(v => Number(v.id))));
  })()
    .catch(e => console.warn('[LucidSales] refresco de copias:', e.message))
    .finally(() => nuevos.forEach(id => calentando.delete(id)));
}
const CACHE_PEDIDO_MS = 45 * 1000;
const cachePedidos = new Map(); // `${tienda}:${id}` -> {t, pedido}

async function pedidoEnVivo(id, tiendaId) {
  const k = `${tiendaId || 'default'}:${id}`;
  const c = cachePedidos.get(k);
  if (c && Date.now() - c.t < CACHE_PEDIDO_MS) return c.pedido;
  const pedido = await getPedidoById(id, tiendaId);
  cachePedidos.set(k, { t: Date.now(), pedido });
  if (cachePedidos.size > 2000) {
    for (const [kk, v] of cachePedidos) if (Date.now() - v.t > CACHE_PEDIDO_MS) cachePedidos.delete(kk);
  }
  return pedido;
}

/** map con concurrencia limitada (no le pega 50 llamadas juntas a LucidSales). */
async function mapLimitado(items, limite, fn) {
  const salida = new Array(items.length);
  let i = 0;
  const trabajadores = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        salida[idx] = await fn(items[idx], idx);
      } catch (error) {
        salida[idx] = { __error: error };
      }
    }
  });
  await Promise.all(trabajadores);
  return salida;
}

function fechaDePedido(p) {
  const v = p?.Fecha || p?.fecha || p?.CreatedAt || p?.createdAt || p?.created_at || null;
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function normalizarBusqueda(v) {
  return String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Lo local de un lote de pedidos: asignacion, vinculacion y etiquetas. */
async function datosLocales(ids) {
  if (ids.length === 0) return { asignacionMap: new Map(), localPorId: new Map(), etiquetasPorId: new Map() };
  const [asignacionMap, locales, etiquetasRegs] = await Promise.all([
    asignacionPedidosService.getAsignaciones(ids),
    prisma.pedidoVinculado.findMany({
      where: { lucidsalesPedidoId: { in: ids } },
      include: {
        asignado: { select: { id: true, nombre: true } },
        createdBy: { select: { id: true, nombre: true } },
        subidoPor: { select: { id: true, nombre: true } }
      }
    }),
    prisma.registroEtiqueta.findMany({
      where: { tabla: 'pedidos_vinculados', registroId: { in: ids.map(String) } },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    })
  ]);
  const localPorId = new Map(locales.map(l => [l.lucidsalesPedidoId, l]));
  const etiquetasPorId = new Map();
  etiquetasRegs.forEach(r => {
    const arr = etiquetasPorId.get(r.registroId) || [];
    arr.push(r.etiqueta);
    etiquetasPorId.set(r.registroId, arr);
  });
  return { asignacionMap, localPorId, etiquetasPorId };
}

function filaDeLista(p, { asignacionMap, localPorId, etiquetasPorId }) {
  const idNum = Number(p.id);
  const loc = localPorId.get(idNum);
  const asig = asignacionMap.get(idNum);
  // Fallback a la vinculacion legacy: pedidos asignados antes de existir
  // la tabla propia conservan su dueno hasta que se reasignen.
  const asignado = asig ? asig.asignado : (loc?.asignado || null);
  const json = p.Json !== undefined && p.Json !== null
    ? (typeof p.Json === 'string' ? p.Json : JSON.stringify(p.Json))
    : (loc?.jsonProductos || '[]');
  return {
    id: idNum,
    idPedido: p.idPedido ?? idNum,
    Nombre: p.Nombre || '',
    Apellido: p.Apellido || '',
    Movil: p.Movil || '',
    Total: p.Total ?? '0',
    EstadoPedido: p.EstadoPedido ?? 0,
    EstadoFullfilment: p.EstadoFullfilment || null,
    origen: p.source || null,
    producto: p.producto || '',
    Referencias: p.Referencias || loc?.referencias || '',
    Json: json,
    conversacionLink: loc?.conversacionLink || null,
    notas: loc?.notas || null,
    asignado,
    creador: loc?.createdBy || null,
    subidoPor: loc?.subidoPor || null,
    createdAt: p.Fecha || p.CreatedAt || p.createdAt || loc?.createdAt || null,
    _etiquetas: etiquetasPorId.get(String(idNum)) || [],
    _vinculado: Boolean(loc)
  };
}

/**
 * Refresca en segundo plano la copia local (estado, total, cliente) de los
 * pedidos que la API acaba de devolver. Solo toca filas que ya existen: no
 * crea vinculaciones nuevas (eso cambiaria las metricas de "vinculados").
 */
function refrescarCopias(apiPedidos, { asignacionMap, localPorId }) {
  const cambios = [];
  for (const p of apiPedidos) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    const estado = Number(p.EstadoPedido ?? 0);
    const fecha = fechaDePedido(p);
    const loc = localPorId.get(id);
    if (loc) {
      const data = {};
      if (loc.estadoPedido !== estado) data.estadoPedido = estado;
      if (p.Total !== undefined && String(loc.total ?? '') !== String(p.Total)) data.total = String(p.Total);
      if (p.Nombre && loc.nombreCliente !== p.Nombre) data.nombreCliente = p.Nombre;
      if (p.Apellido !== undefined && loc.apellidoCliente !== (p.Apellido || '')) data.apellidoCliente = p.Apellido || '';
      if (p.Movil && loc.movil !== p.Movil) data.movil = p.Movil;
      // copia vieja pero igual: se toca para que cuente como fresca
      const vieja = !loc.updatedAt || Date.now() - new Date(loc.updatedAt).getTime() > COPIA_FRESCA_MS / 2;
      if (!Object.keys(data).length && vieja) data.estadoPedido = estado;
      if (Object.keys(data).length) {
        cambios.push(prisma.pedidoVinculado.update({ where: { lucidsalesPedidoId: id }, data }));
      }
    }
    if (asignacionMap.has(id)) {
      const a = asignacionMap.get(id);
      const vieja = !a.updatedAt || Date.now() - new Date(a.updatedAt).getTime() > COPIA_FRESCA_MS / 2;
      if (a.estadoPedido !== estado || (fecha && !a.fechaPedido) || vieja) {
        cambios.push(prisma.asignacionPedido.update({
          where: { lucidsalesPedidoId: id },
          data: { estadoPedido: estado, ...(fecha ? { fechaPedido: fecha } : {}) }
        }));
      }
    }
  }
  if (cambios.length) {
    Promise.allSettled(cambios).then(rs => {
      const fallos = rs.filter(r => r.status === 'rejected');
      if (fallos.length) console.warn(`[LucidSales] ${fallos.length} copia(s) local(es) sin refrescar:`, fallos[0].reason?.message);
    });
  }
}

/** ids (desc) de los pedidos asignados a un operador en la tienda. */
async function idsAsignadosA(asignadoId, tiendaId) {
  const propios = await prisma.asignacionPedido.findMany({
    where: { asignadoId, ...(tiendaId ? { tiendaId } : {}) },
    select: { lucidsalesPedidoId: true }
  });
  const legacy = await prisma.pedidoVinculado.findMany({
    where: { asignadoId, ...(tiendaId ? { tiendaId } : {}) },
    select: { lucidsalesPedidoId: true }
  });
  const legacyIds = legacy.map(l => l.lucidsalesPedidoId);
  // un pedido reasignado en la tabla propia ya no es del dueno legacy
  const reasignados = legacyIds.length
    ? new Set((await prisma.asignacionPedido.findMany({
        where: { lucidsalesPedidoId: { in: legacyIds } },
        select: { lucidsalesPedidoId: true }
      })).map(r => r.lucidsalesPedidoId))
    : new Set();
  const ids = new Set(propios.map(p => p.lucidsalesPedidoId));
  for (const id of legacyIds) if (!reasignados.has(id)) ids.add(id);
  return ids;
}

async function idsConEtiqueta(etiquetaId) {
  const regs = await prisma.registroEtiqueta.findMany({
    where: { etiquetaId, tabla: 'pedidos_vinculados' },
    select: { registroId: true }
  });
  return new Set(regs.map(r => Number(r.registroId)).filter(Number.isFinite));
}

async function listPorIdsLocales({ page = 1, itemsPerPage = 50, search = '', estados, fechaDesde, fechaHasta, producto, asignadoId, etiquetaId, tiendaId = null }) {
  let candidatos = null;
  if (asignadoId) candidatos = await idsAsignadosA(asignadoId, tiendaId);
  if (etiquetaId) {
    const conEtiqueta = await idsConEtiqueta(etiquetaId);
    candidatos = candidatos ? new Set([...candidatos].filter(id => conEtiqueta.has(id))) : conEtiqueta;
  }
  let ids = [...(candidatos || [])].sort((a, b) => b - a); // id de LucidSales crece con el tiempo

  // prefiltro con la copia local. Solo se confia en ella si es reciente o si
  // el estado ya no cambia (entregado, devuelto, cancelado); lo demas se mira
  // en vivo, asi una copia vieja nunca deja fuera un pedido que si cumple.
  const filtraEstado = Array.isArray(estados) && estados.length > 0;
  const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`) : null;
  const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`) : null;
  let sinCopiaFiable = 0;
  const porVerificar = [];
  if (ids.length && (filtraEstado || desde || hasta)) {
    const [asigs, locs] = await Promise.all([
      prisma.asignacionPedido.findMany({ where: { lucidsalesPedidoId: { in: ids } }, select: { lucidsalesPedidoId: true, estadoPedido: true, fechaPedido: true, updatedAt: true } }),
      prisma.pedidoVinculado.findMany({ where: { lucidsalesPedidoId: { in: ids } }, select: { lucidsalesPedidoId: true, estadoPedido: true, updatedAt: true } })
    ]);
    const fiable = (estado, updatedAt) => estado !== null && estado !== undefined &&
      (ESTADOS_FINALES.has(Number(estado)) || (updatedAt && Date.now() - new Date(updatedAt).getTime() < COPIA_FRESCA_MS));
    const copia = new Map();
    locs.forEach(l => {
      if (fiable(l.estadoPedido, l.updatedAt)) copia.set(l.lucidsalesPedidoId, { estado: l.estadoPedido, fecha: null });
    });
    asigs.forEach(a => {
      const prev = copia.get(a.lucidsalesPedidoId);
      const estadoOk = fiable(a.estadoPedido, a.updatedAt);
      if (!estadoOk && !prev && !a.fechaPedido) return;
      copia.set(a.lucidsalesPedidoId, {
        estado: estadoOk ? a.estadoPedido : (prev?.estado ?? null),
        fecha: a.fechaPedido || null
      });
    });
    ids = ids.filter(id => {
      const c = copia.get(id);
      if (!c || ((filtraEstado && (c.estado === null || c.estado === undefined)))) {
        sinCopiaFiable++;
        porVerificar.push(id);
        return true;
      }
      if (filtraEstado && !estados.includes(Number(c.estado))) return false;
      if (c.fecha && desde && c.fecha < desde) return false;
      if (c.fecha && hasta && c.fecha > hasta) return false;
      return true;
    });
  }

  const q = normalizarBusqueda(search);
  const cumpleEnVivo = p => {
    if (filtraEstado && !estados.includes(Number(p.EstadoPedido ?? 0))) return false;
    const f = fechaDePedido(p);
    if (f && desde && f < desde) return false;
    if (f && hasta && f > hasta) return false;
    if (producto) {
      const json = typeof p.Json === 'string' ? p.Json : JSON.stringify(p.Json || []);
      if (!json.includes(String(producto))) return false;
    }
    if (q) {
      const texto = normalizarBusqueda([p.Nombre, p.Apellido, p.Movil, p.idPedido, p.id, p.Referencias].join(' '));
      if (!texto.includes(q)) return false;
    }
    return true;
  };
  // hay que mirar en vivo si algun filtro no se pudo resolver con la copia
  const escanear = Boolean(q || producto || sinCopiaFiable);

  let pagina;
  let apiPedidos;
  let total;
  let aproximado = false;
  let errores = 0;
  if (!escanear) {
    // todo resuelto con la base: se pagina directo y solo se lee la pagina
    total = ids.length;
    pagina = ids.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const vivos = await mapLimitado(pagina, CONCURRENCIA_VIVO, id => pedidoEnVivo(id, tiendaId));
    errores = vivos.filter(v => v && v.__error).length;
    if (errores && errores === vivos.length) throw vivos[0].__error;
    apiPedidos = vivos.filter(v => v && !v.__error && v.id && cumpleEnVivo(v));
  } else {
    // se recorren los candidatos en tandas hasta llenar la pagina pedida
    // (con tope de lecturas); lo leido queda en cache y en la copia local
    const necesarios = page * itemsPerPage;
    const coinciden = [];
    let i = 0;
    let leidos = 0;
    while (coinciden.length < necesarios && i < ids.length && leidos < MAX_ESCANEO) {
      const tanda = ids.slice(i, i + TANDA_ESCANEO);
      i += tanda.length;
      leidos += tanda.length;
      const vivos = await mapLimitado(tanda, CONCURRENCIA_VIVO, id => pedidoEnVivo(id, tiendaId));
      const buenos = vivos.filter(v => v && !v.__error && v.id);
      errores += vivos.length - buenos.length;
      if (buenos.length) refrescarCopias(buenos, await datosLocales(buenos.map(v => Number(v.id))));
      coinciden.push(...buenos.filter(cumpleEnVivo));
    }
    if (errores && !coinciden.length && errores >= leidos) throw new Error('No se pudieron leer los pedidos de LucidSales');
    apiPedidos = coinciden.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    pagina = apiPedidos.map(p => Number(p.id));
    const quedan = ids.length - i;
    aproximado = quedan > 0;
    // sin recorrer todo, el total es "al menos lo encontrado" + lo que falta mirar
    total = coinciden.length + quedan;
  }

  const locales = await datosLocales(pagina);
  if (!escanear) refrescarCopias(apiPedidos, locales);

  // lo que no tenia copia fiable y no se alcanzo a leer se refresca en
  // segundo plano: el siguiente filtro ya lo tiene al dia
  if (porVerificar.length) {
    const vistos = new Set(pagina);
    calentarCopias(porVerificar.filter(id => !vistos.has(id)).slice(0, 120), tiendaId);
  }

  return {
    ok: true,
    pedidos: apiPedidos.map(p => filaDeLista(p, locales)),
    totalRecords: total,
    numPages: Math.max(1, Math.ceil(total / itemsPerPage)),
    fuente: 'api-por-ids',
    ...(aproximado ? { totalAproximado: true } : {}),
    ...(errores ? { avisos: [`${errores} pedido(s) no se pudieron leer de LucidSales`] } : {})
  };
}

/** Filtros de get-pedidos-light-data (fecha desc + estados + producto). */
function filtrosApi({ estados, fechaDesde, fechaHasta, producto } = {}) {
  const filtros = [{ name: 'date', searchValues: [], sortOrder: 'desc' }];
  if (fechaDesde || fechaHasta) {
    const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`).toISOString() : '1970-01-01T00:00:00.000Z';
    const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).toISOString() : new Date(Date.now() + 864e5).toISOString();
    filtros[0].searchValues = [`${desde}|${hasta}`];
  }
  if (Array.isArray(estados) && estados.length > 0) {
    const nombres = estados.map(e => NOMBRES_ESTADO_LS[e]).filter(Boolean);
    if (nombres.length > 0) filtros.push({ name: 'orderStatus', searchValues: nombres, sortOrder: null });
  }
  if (producto) {
    filtros.push({ name: 'product', searchValues: [String(producto)], sortOrder: null });
  }
  return JSON.stringify(filtros);
}

async function listPedidosDirecto(opts = {}) {
  const { page = 1, itemsPerPage = 50, search = '', estados, fechaDesde, fechaHasta, producto, tiendaId = null, asignadoId, etiquetaId } = opts;
  if ((asignadoId && asignadoId !== '__sin__') || etiquetaId) {
    return listPorIdsLocales(opts);
  }

  const res = await getPedidos({ page, itemsPerPage, search, filters: filtrosApi({ estados, fechaDesde, fechaHasta, producto }), tiendaId });
  const apiPedidos = Array.isArray(res.pedidos) ? res.pedidos : [];
  const totalRecords = Number(res.totalRecords || 0);
  const ids = apiPedidos.map(p => Number(p.id)).filter(n => Number.isFinite(n));

  const locales = await datosLocales(ids);
  refrescarCopias(apiPedidos, locales);

  let pedidos = apiPedidos.map(p => filaDeLista(p, locales));
  // "sin asignar" no se puede sacar de la base (es todo lo que NO esta en
  // ella): se filtra sobre la pagina que trajo la API
  if (asignadoId === '__sin__') pedidos = pedidos.filter(p => !p.asignado);

  return {
    ok: true,
    pedidos,
    totalRecords,
    numPages: Math.max(1, Math.ceil(totalRecords / itemsPerPage)),
    fuente: 'api',
    ...(asignadoId === '__sin__' ? { filtroEnPagina: true } : {})
  };
}

module.exports = {
  getPedidos,
  getPedidoById,
  updatePedido,
  createPedido,
  cotizarEnvio,
  confirmarIntegracion,
  validateAddress,
  getFiltersData,
  getPaises,
  getDepartamentos,
  getCiudades,
  verificarConexion,
  clearTokenCache,
  getProductos,
  getProducto,
  validateDropiId,
  getCiudadesLocales,
  getDepartamentosLocales,
  crearVinculacion,
  crearVinculacionDirecta,
  guardarVinculacionLocal,
  listVinculaciones,
  listPedidosDirecto,
  listPorIdsLocales,
  filtrosApi,
  idsAsignadosA,
  ESTADOS_FINALES,
  COPIA_FRESCA_MS
};
