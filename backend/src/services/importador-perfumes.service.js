const { prisma } = require('../prisma/client');
const { postBotField } = require('./lucidbot.service');

function safeParseArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function safeParseJson(v, fallback = {}) {
  if (typeof v === 'string' && v.trim().length > 0) {
    try { return JSON.parse(v); } catch { return fallback; }
  }
  if (v && typeof v === 'object') return v;
  return fallback;
}

function arrayToReglas(arr) {
  const obj = {};
  (Array.isArray(arr) ? arr : []).forEach((regla, i) => {
    obj[`regla_${i + 1}`] = regla;
  });
  return obj;
}

function parseBundle(bundle) {
  const parsed = safeParseArray(bundle);
  return parsed.map(b => ({
    cant: Number(b.cant ?? b.Cant ?? b.cantidad ?? 1) || 1,
    precio: Number(b.precio ?? b.Precio ?? b.price ?? 0) || 0
  }));
}

function buildPreciosTotales(bundle) {
  const map = {};
  parseBundle(bundle).forEach(b => {
    map[`${b.cant}_unidad(es)_subtotal`] = `${b.precio} pesos`;
  });
  return map;
}

function buildPreciosPorCantidad(bundle) {
  const map = {};
  parseBundle(bundle).forEach(b => {
    map[`${b.cant}_unidad(es)`] = `${b.precio}`;
  });
  return map;
}

function extraerImagenes(producto) {
  if (Array.isArray(producto.imagenes)) {
    return producto.imagenes
      .map(i => (typeof i === 'string' ? i : i?.image))
      .filter(url => url && String(url).startsWith('http'));
  }
  if (typeof producto.imagenes === 'string' && producto.imagenes.trim().length > 0) {
    try {
      const parsed = JSON.parse(producto.imagenes);
      if (Array.isArray(parsed)) return parsed.map(i => (typeof i === 'string' ? i : i?.image)).filter(u => u && String(u).startsWith('http'));
    } catch { /* sin imagenes validas */ }
  }
  const extra = [];
  Object.keys(producto).filter(k => /imagen|image|img|foto|picture/i.test(k)).forEach(k => {
    const v = producto[k];
    if (typeof v === 'string' && v.startsWith('http')) extra.push(v);
  });
  return extra;
}

function extraerPrecio(producto) {
  if (producto.precioMin != null && Number(producto.precioMin) > 0) return Number(producto.precioMin);
  if (producto.precioSugerido != null && Number(producto.precioSugerido) > 0) return Number(producto.precioSugerido);
  const bundle = parseBundle(producto.bundle);
  if (bundle.length > 0 && bundle[0].precio > 0) return bundle[0].precio;
  return 0;
}

const BOT_FIELDS = [
  {
    key: 'adIds',
    configKey: 'botFieldAdIds',
    rootKey: 'match_de_producto',
    build: (p) => ({
      nombre_del_producto: p.Nombre || '',
      ad_ids: safeParseArray(p.AdsMetaTags)
    })
  },
  {
    key: 'catalogo',
    configKey: 'botFieldCatalogo',
    rootKey: 'catalogo_de_productos',
    build: (p) => ({
      nombre_del_producto: p.Nombre || '',
      descripcion_del_producto: p.Descripcion || '',
      especificaciones_tecnicas: p.CaracteristicasTecnicas || '',
      contenido_paquete: p.ContenidoPaquete || '',
      modo_de_uso: p.ModoDeUso || '',
      reglas: arrayToReglas(safeParseArray(p.Reglas)),
      datos_para_orden: {},
      precios_totales: buildPreciosTotales(p.bundle),
      variantes: p.variantes ?? null,
      preguntas_frecuentes: safeParseArray(p.PreguntasFrecuentes)
    })
  },
  {
    key: 'integracion',
    configKey: 'botFieldIntegracion',
    rootKey: 'catalogo_de_productos',
    idKey: 'lucidsales_product_id',
    build: (p) => ({
      nombre_del_producto: p.Nombre || '',
      ids_integracion: { lucidsales_product_id: `ls-prod-${String(p.id ?? '').trim() || generarSlug(p.Nombre || 'producto')}` },
      precios_por_cantidad: buildPreciosPorCantidad(p.bundle)
    })
  },
  {
    key: 'mensajes',
    configKey: 'botFieldMensajes',
    rootKey: 'mensajes_iniciales',
    build: (p) => ({
      nombre_del_producto: p.Nombre || '',
      mensaje_inicial: safeParseArray(p.MensajeInicial)
    })
  },
  {
    key: 'multimedia',
    configKey: 'botFieldMultimedia',
    rootKey: 'catalogo_multimedia',
    build: (p) => ({
      nombre_del_producto: p.Nombre || '',
      imagenes: { producto: extraerImagenes(p).map(url => ({ url })) },
      videos: safeParseArray(p.videos),
      testimonios: safeParseArray(p.Testimonios)
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
  if (field.idKey === 'lucidsales_product_id') {
    return entrada.ids_integracion?.lucidsales_product_id || '';
  }
  return entrada[field.idKey || 'nombre_del_producto'] || '';
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

async function escribirBotField(tienda, field, producto) {
  const cache = await leerCache(tienda.id, field.key);
  const lista = Array.isArray(cache[field.rootKey]) ? cache[field.rootKey] : [];
  const entrada = field.build(producto);
  const clave = extraerClave(entrada, field);
  if (!clave) throw new Error(`Sin clave de dedupe para el producto`);
  const nuevaLista = mergeEntrada(lista, entrada, field);
  const nuevoValor = { [field.rootKey]: nuevaLista };
  const valueStr = JSON.stringify(nuevoValor);
  await postBotField({
    apiKey: tienda.lucidbotApiKey,
    botFieldId: tienda[field.configKey],
    value: valueStr
  });
  await guardarCache(tienda.id, field.key, nuevoValor);
  return entrada;
}

function generarSlug(nombre) {
  return String(nombre || 'producto')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80) || 'producto';
}

async function slugUnico(base) {
  const existente = await prisma.productoTienda.findFirst({ where: { slug: base }, select: { id: true } });
  if (!existente) return base;
  for (let i = 2; i < 100; i++) {
    const cand = `${base}-${i}`.substring(0, 80);
    const dup = await prisma.productoTienda.findFirst({ where: { slug: cand }, select: { id: true } });
    if (!dup) return cand;
  }
  return `${base}-${Date.now().toString(36)}`.substring(0, 80);
}

async function guardarCatalogoLocal(tienda, producto, usuarioId) {
  const lucidsalesId = String(producto.id ?? '');
  const imagenes = extraerImagenes(producto);
  const data = {
    nombre: producto.Nombre || `Producto ${lucidsalesId}`,
    descripcion: producto.Descripcion || null,
    categoria: producto.categoria || producto.Categoria || 'Perfumes',
    precioVenta: extraerPrecio(producto),
    imagen: imagenes[0] || null,
    imagenes,
    lucidsalesId,
    activo: true,
    createdById: usuarioId
  };

  const baseSlug = generarSlug(producto.Nombre || lucidsalesId);

  if (!lucidsalesId) {
    return prisma.productoTienda.create({ data: { tiendaId: tienda.id, ...data, slug: await slugUnico(baseSlug) } });
  }

  const existente = await prisma.productoTienda.findFirst({
    where: { tiendaId: tienda.id, lucidsalesId }
  });
  if (existente) {
    return prisma.productoTienda.update({ where: { id: existente.id }, data });
  }
  return prisma.productoTienda.create({ data: { tiendaId: tienda.id, ...data, slug: await slugUnico(baseSlug) } });
}

async function importarProductos(tienda, productoIds, usuarioId) {
  const lucidsalesService = require('./lucidsales.service');
  const lsProductos = await lucidsalesService.getProductos();
  const todos = Array.isArray(lsProductos) ? lsProductos : (lsProductos?.productos || lsProductos?.data || []);

  const seleccionados = (productoIds && productoIds.length > 0)
    ? todos.filter(p => productoIds.includes(String(p.id ?? p.Id)))
    : todos;

  const resumen = { total: seleccionados.length, ok: 0, error: 0, detalle: [] };

  const camposFaltantes = BOT_FIELDS.filter(f => !tienda[f.configKey]).map(f => f.configKey);
  if (!tienda.lucidbotApiKey) camposFaltantes.unshift('lucidbotApiKey');

  for (const producto of seleccionados) {
    const idLS = String(producto.id ?? producto.Id ?? '');
    const nombre = producto.Nombre || producto.nombre || `Producto ${idLS}`;
    const errores = [];

    if (camposFaltantes.length === 0) {
      for (const field of BOT_FIELDS) {
        try {
          await escribirBotField(tienda, field, producto);
        } catch (err) {
          errores.push(`${field.key}: ${err.message}`);
        }
      }
    } else {
      errores.push(`Config incompleta: ${camposFaltantes.join(', ')}`);
    }

    let catalogoOk = false;
    try {
      await guardarCatalogoLocal(tienda, producto, usuarioId);
      catalogoOk = true;
    } catch (err) {
      errores.push(`catalogo_local: ${err.message}`);
    }

    const estado = errores.length === 0 && catalogoOk ? 'ok' : 'error';

    try {
      await prisma.importLogProducto.create({
        data: {
          tiendaId: tienda.id,
          lucidsalesProductoId: idLS,
          nombre,
          estado,
          detalle: errores.length > 0 ? errores.join(' | ').substring(0, 2000) : null
        }
      });
    } catch (logErr) {
      console.error('[Perfumes] Error guardando log:', logErr.message);
    }

    if (estado === 'ok') {
      resumen.ok++;
    } else {
      resumen.error++;
    }
    resumen.detalle.push({ id: idLS, nombre, estado, errores });
  }

  return resumen;
}

async function desimportarProducto(tienda, productoLocal) {
  const errores = [];
  const nombre = productoLocal.nombre || '';
  const claveIntegracion = `ls-prod-${productoLocal.lucidsalesId || ''}`;

  for (const field of BOT_FIELDS) {
    if (!tienda[field.configKey]) {
      errores.push(`${field.key}: sin bot_field_id configurado`);
      continue;
    }
    try {
      const cache = await leerCache(tienda.id, field.key);
      const lista = Array.isArray(cache[field.rootKey]) ? cache[field.rootKey] : [];
      const nuevaLista = lista.filter(e => {
        if (field.idKey === 'lucidsales_product_id') {
          return (e.ids_integracion?.lucidsales_product_id || '') !== claveIntegracion;
        }
        return (e.nombre_del_producto || '') !== nombre;
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

module.exports = { importarProductos, desimportarProducto, BOT_FIELDS };
