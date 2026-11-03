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
// Devuelve el objeto producto ya desenvuelto, igual que el cliente de Zunto.
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

// Lista de pedidos LLAMANDO DIRECTO a la API de LucidSales (estilo Zunto).
// La tabla PedidoVinculado ya no es fuente de datos: solo aporta asignación,
// etiquetas, notas y snapshot, unidos por lucidsalesPedidoId.
async function listPedidosDirecto({ page = 1, itemsPerPage = 50, search = '', estados, fechaDesde, fechaHasta, producto, tiendaId = null } = {}) {
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

  const res = await getPedidos({ page, itemsPerPage, search, filters: JSON.stringify(filtros), tiendaId });
  const apiPedidos = Array.isArray(res.pedidos) ? res.pedidos : [];
  const totalRecords = Number(res.totalRecords || 0);
  const ids = apiPedidos.map(p => Number(p.id)).filter(n => Number.isFinite(n));

  // Merge local: asignacion (tabla propia estilo Zunto), etiquetas, notas, snapshot
  const asignacionMap = ids.length > 0 ? await asignacionPedidosService.getAsignaciones(ids) : new Map();

  const locales = ids.length > 0 ? await prisma.pedidoVinculado.findMany({
    where: { lucidsalesPedidoId: { in: ids } },
    include: {
      asignado: { select: { id: true, nombre: true } },
      createdBy: { select: { id: true, nombre: true } },
      subidoPor: { select: { id: true, nombre: true } }
    }
  }) : [];
  const localPorId = new Map(locales.map(l => [l.lucidsalesPedidoId, l]));

  const etiquetasRegs = ids.length > 0 ? await prisma.registroEtiqueta.findMany({
    where: { tabla: 'pedidos_vinculados', registroId: { in: ids.map(String) } },
    include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
  }) : [];
  const etiquetasPorId = new Map();
  etiquetasRegs.forEach(r => {
    const arr = etiquetasPorId.get(r.registroId) || [];
    arr.push(r.etiqueta);
    etiquetasPorId.set(r.registroId, arr);
  });

  const pedidos = apiPedidos.map(p => {
    const idNum = Number(p.id);
    const loc = localPorId.get(idNum);
    const asig = asignacionMap.get(idNum);
    // Fallback a la vinculacion legacy: pedidos asignados antes de existir
    // la tabla propia conservan su dueno hasta que se reasignen.
    const asignado = asig ? asig.asignado : (loc?.asignado || null);
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
      Json: loc?.jsonProductos || '[]',
      conversacionLink: loc?.conversacionLink || null,
      notas: loc?.notas || null,
      asignado,
      creador: loc?.createdBy || null,
      subidoPor: loc?.subidoPor || null,
      createdAt: p.Fecha || p.CreatedAt || loc?.createdAt || null,
      _etiquetas: etiquetasPorId.get(String(idNum)) || [],
      _vinculado: Boolean(loc)
    };
  });

  return {
    ok: true,
    pedidos,
    totalRecords,
    numPages: Math.max(1, Math.ceil(totalRecords / itemsPerPage)),
    fuente: 'api'
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
  listPedidosDirecto
};
