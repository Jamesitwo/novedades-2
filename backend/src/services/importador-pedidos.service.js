const { prisma } = require('../prisma/client');
const { postBotField } = require('./lucidbot.service');

function safeParseJson(v, fallback = {}) {
  if (typeof v === 'string' && v.trim().length > 0) {
    try { return JSON.parse(v); } catch { return fallback; }
  }
  if (v && typeof v === 'object') return v;
  return fallback;
}

const BOT_FIELDS_PEDIDOS = [
  {
    key: 'pedidos',
    configKey: 'botFieldPedidos',
    rootKey: 'pedidos_lucidsales',
    idKey: 'lucidsales_pedido_id',
    build: (p) => ({
      nombre_del_pedido: p.nombrePedido,
      cliente: p.cliente,
      telefono: p.telefono,
      ciudad: p.ciudad,
      departamento: p.departamento,
      direccion: p.direccion,
      productos: p.productos,
      total: p.total,
      costo_envio: p.costoEnvio,
      referencias: p.referencias
    })
  },
  {
    key: 'integracion_pedidos',
    configKey: 'botFieldIntegracionPedidos',
    rootKey: 'pedidos_lucidsales',
    idKey: 'lucidsales_pedido_id',
    build: (p) => ({
      nombre_del_pedido: p.nombrePedido,
      ids_integracion: { lucidsales_pedido_id: p.clave }
    })
  }
];

async function leerCache(tiendaId, botFieldKey) {
  const row = await prisma.botFieldCache.findUnique({
    where: { tiendaId_botFieldId: { tiendaId, botFieldId: botFieldKey } }
  });
  return row ? safeParseJson(row.value, {}) : {};
}

async function guardarCache(tiendaId, botFieldKey, valueObj) {
  await prisma.botFieldCache.upsert({
    where: { tiendaId_botFieldId: { tiendaId, botFieldId: botFieldKey } },
    update: { value: JSON.stringify(valueObj) },
    create: { tiendaId, botFieldId: botFieldKey, value: JSON.stringify(valueObj) }
  });
}

function extraerClave(entrada, field) {
  if (field.idKey === 'lucidsales_pedido_id') {
    return entrada.ids_integracion?.lucidsales_pedido_id || '';
  }
  return entrada[field.idKey || 'nombre_del_pedido'] || '';
}

function mergeEntrada(lista, entrada, field) {
  const clave = extraerClave(entrada, field);
  const idx = lista.findIndex(e => extraerClave(e, field) === clave);
  if (idx >= 0) {
    lista[idx] = entrada;
  } else {
    lista.push(entrada);
  }
  return lista;
}

async function escribirBotField(tienda, field, pedido) {
  const cache = await leerCache(tienda.id, field.key);
  const lista = Array.isArray(cache[field.rootKey]) ? cache[field.rootKey] : [];
  const entrada = field.build(pedido);
  const clave = extraerClave(entrada, field);
  if (!clave) throw new Error('Sin clave de dedupe para el pedido');
  const nuevaLista = mergeEntrada(lista, entrada, field);
  const nuevoValor = { [field.rootKey]: nuevaLista };
  await postBotField({
    apiKey: tienda.lucidbotApiKey,
    botFieldId: tienda[field.configKey],
    value: JSON.stringify(nuevoValor)
  });
  await guardarCache(tienda.id, field.key, nuevoValor);
  return entrada;
}

let productosMapPromise = null;
async function obtenerMapaProductos() {
  if (!productosMapPromise) {
    productosMapPromise = (async () => {
      const lucidsalesService = require('./lucidsales.service');
      const lsProductos = await lucidsalesService.getProductos();
      const todos = Array.isArray(lsProductos) ? lsProductos : (lsProductos?.productos || lsProductos?.data || []);
      const map = {};
      todos.forEach(p => {
        const id = String(p.id ?? p.Id ?? '');
        if (id) map[id] = p.Nombre || p.nombre || `Producto #${id}`;
      });
      return map;
    })().catch(err => {
      console.error('[ImportadorPedidos] Error cargando productos:', err.message);
      productosMapPromise = null;
      return {};
    });
  }
  return productosMapPromise;
}

function nombreDe(ciudades, deptos, id) {
  const n = Number(id);
  if (!n) return '';
  const ciudad = ciudades.find(c => Number(c.id) === n);
  if (ciudad?.name) return ciudad.name;
  const depto = deptos.find(d => Number(d.id) === n);
  return depto?.name || String(id || '');
}

async function normalizarPedido(pedidoLS) {
  const mapa = await obtenerMapaProductos();
  let ciudades = [];
  let deptos = [];
  try {
    ciudades = require('../data/lucidsales_ciudades.json');
    deptos = require('../data/lucidsales_departamentos.json');
  } catch { /* sin mapas locales */ }

  let json = [];
  if (typeof pedidoLS.Json === 'string') {
    try { json = JSON.parse(pedidoLS.Json); } catch { json = []; }
  } else if (Array.isArray(pedidoLS.Json)) {
    json = pedidoLS.Json;
  }

  const productos = json.map(prod => ({
    nombre: mapa[String(prod.product_id ?? '')] || `Producto #${prod.product_id ?? ''}`,
    cantidad: Number(prod.quantity ?? prod.cantidad ?? 1) || 1,
    precio: Number(prod.price ?? prod.precio ?? 0) || 0
  }));

  const idPedido = pedidoLS.idPedido ?? pedidoLS.id;
  const clave = `ls-ped-${String(idPedido ?? '').trim() || 'sin-id'}`;

  return {
    nombrePedido: `Pedido #${idPedido ?? pedidoLS.id ?? ''}`,
    clave,
    cliente: `${pedidoLS.Nombre || ''} ${pedidoLS.Apellido || ''}`.trim() || 'Sin nombre',
    telefono: pedidoLS.Movil || '',
    ciudad: nombreDe(ciudades, deptos, pedidoLS.Ciudad),
    departamento: nombreDe(deptos, ciudades, pedidoLS.Departamento),
    direccion: pedidoLS.Direccion || '',
    productos,
    total: Number(pedidoLS.Total || 0) || 0,
    costoEnvio: Number(pedidoLS.CostoEnvio || 0) || 0,
    referencias: pedidoLS.Referencias || ''
  };
}

async function importarPedidos(tienda, pedidoIds, _usuarioId) {
  const lucidsalesService = require('./lucidsales.service');

  const resumen = { total: pedidoIds.length, ok: 0, error: 0, detalle: [] };

  const camposFaltantes = BOT_FIELDS_PEDIDOS.filter(f => !tienda[f.configKey]).map(f => f.configKey);
  if (!tienda.lucidbotApiKey) camposFaltantes.unshift('lucidbotApiKey');

  for (const idRaw of pedidoIds) {
    const id = String(idRaw);
    let pedidoLS = null;
    const errores = [];

    try {
      pedidoLS = await lucidsalesService.getPedidoById(id);
    } catch (err) {
      errores.push(`lucidsales: ${err.message}`);
    }

    let nombre = `Pedido #${id}`;
    let cliente = 'Sin nombre';

    if (pedidoLS && !pedidoLS.id) {
      errores.push('Pedido no encontrado en LucidSales');
    }

    if (pedidoLS?.id && camposFaltantes.length === 0) {
      const normalizado = await normalizarPedido(pedidoLS);
      nombre = normalizado.nombrePedido;
      cliente = normalizado.cliente;
      for (const field of BOT_FIELDS_PEDIDOS) {
        try {
          await escribirBotField(tienda, field, normalizado);
        } catch (err) {
          errores.push(`${field.key}: ${err.message}`);
        }
      }
    } else if (pedidoLS?.id) {
      errores.push(`Config incompleta: ${camposFaltantes.join(', ')}`);
    }

    const estado = errores.length === 0 ? 'ok' : 'error';

    try {
      await prisma.importLogPedido.create({
        data: {
          tiendaId: tienda.id,
          lucidsalesPedidoId: id,
          cliente,
          estado,
          detalle: errores.length > 0 ? errores.join(' | ').substring(0, 2000) : null
        }
      });
    } catch (logErr) {
      console.error('[ImportadorPedidos] Error guardando log:', logErr.message);
    }

    if (estado === 'ok') resumen.ok++; else resumen.error++;
    resumen.detalle.push({ id, nombre, estado, errores });
  }

  return resumen;
}

async function desimportarPedido(tienda, log) {
  const errores = [];
  const clave = `ls-ped-${log.lucidsalesPedidoId || ''}`;
  const nombrePedido = `Pedido #${log.lucidsalesPedidoId || ''}`;

  for (const field of BOT_FIELDS_PEDIDOS) {
    if (!tienda[field.configKey]) {
      errores.push(`${field.key}: sin bot_field_id configurado`);
      continue;
    }
    try {
      const cache = await leerCache(tienda.id, field.key);
      const lista = Array.isArray(cache[field.rootKey]) ? cache[field.rootKey] : [];
      const nuevaLista = lista.filter(e => {
        if (field.idKey === 'lucidsales_pedido_id') {
          return (e.ids_integracion?.lucidsales_pedido_id || '') !== clave;
        }
        return (e.nombre_del_pedido || '') !== nombrePedido;
      });
      if (nuevaLista.length === lista.length) continue;
      const nuevoValor = { [field.rootKey]: nuevaLista };
      await postBotField({
        apiKey: tienda.lucidbotApiKey,
        botFieldId: tienda[field.configKey],
        value: JSON.stringify(nuevoValor)
      });
      await guardarCache(tienda.id, field.key, nuevoValor);
    } catch (err) {
      errores.push(`${field.key}: ${err.message}`);
    }
  }

  return errores;
}

module.exports = { importarPedidos, desimportarPedido, BOT_FIELDS_PEDIDOS };
