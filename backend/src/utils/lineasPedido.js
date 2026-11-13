// Lineas de producto de un pedido de LucidSales (campo `Json`).
//
// Un producto SIN variantes trae precio y cantidad en la linea:
//   {product_id, price: 84900, quantity: 1, variations: []}
// Un producto CON variantes los trae en cada variante y la linea va en null:
//   {product_id, price: null, quantity: null,
//    variations: [{variation_id, price: 116900, quantity: 2}]}
//
// Todo calculo de cantidad o valor de una linea tiene que pasar por aqui: si
// se lee `price`/`quantity` de la linea, un producto con variantes vale $0.

/** Numero o el valor por defecto (null, '' y basura cuentan como vacio). */
function num(v, def = 0) {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** ¿La linea lleva precio y cantidad en sus variantes? */
function tieneVariantes(it) {
  return Array.isArray(it?.variations) && it.variations.length > 0 &&
    it.variations.some(v => v && typeof v === 'object' && (v.price !== undefined || v.quantity !== undefined));
}

/** Unidades de la linea (suma de sus variantes si las tiene). */
function cantidadLinea(it) {
  if (tieneVariantes(it)) return it.variations.reduce((a, v) => a + num(v?.quantity, 1), 0);
  return num(it?.quantity, 1);
}

/** Valor de la linea (precio x cantidad, de cada variante si las tiene). */
function totalLinea(it) {
  if (tieneVariantes(it)) return it.variations.reduce((a, v) => a + num(v?.price) * num(v?.quantity, 1), 0);
  return num(it?.price) * num(it?.quantity, 1);
}

/** Subtotal de todas las lineas. */
function subtotalLineas(items) {
  return (Array.isArray(items) ? items : []).reduce((a, it) => a + totalLinea(it), 0);
}

/**
 * Multiplica los precios por `ratio` (para repartir un total nuevo): en la
 * linea si no tiene variantes, en cada variante si las tiene.
 */
function escalarPrecios(items, ratio) {
  return (Array.isArray(items) ? items : []).map(it => {
    if (tieneVariantes(it)) {
      return { ...it, variations: it.variations.map(v => (v && typeof v === 'object' ? { ...v, price: Math.round(num(v.price) * ratio) } : v)) };
    }
    return { ...it, price: Math.round(num(it?.price) * ratio) };
  });
}

const arreglo = v => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
};

const igual = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

/**
 * Variantes de la ficha de un producto: [{sku, nombre, corto, precio, stock}].
 * El `sku` de cada combinacion es el `variation_id` que va en la linea.
 *   nombre: "Copa: Blanca; Tamaño: 150 cm"   corto: "Blanca / 150 cm"
 * Precio y stock salen de `bundleVariantes[].variantes[]` (misma combinacion).
 */
function opcionesVariantes(prod) {
  const atributos = arreglo(prod?.variantes).map(v => String(v?.nombre ?? '').trim());
  const bundle = arreglo(prod?.bundleVariantes).flatMap(b => arreglo(b?.variantes));
  return arreglo(prod?.mixedvariantes)
    .filter(m => m?.sku)
    .map(m => {
      const items = arreglo(m.items).map(x => String(x ?? '').trim());
      const b = bundle.find(v => {
        const its = arreglo(v?.items);
        return its.length === items.length && its.every((x, i) => igual(x, items[i]));
      });
      const stock = b?.stock;
      return {
        sku: String(m.sku),
        nombre: items.map((x, i) => (atributos[i] ? `${atributos[i]}: ${x}` : x)).join('; '),
        corto: items.join(' / '),
        precio: num(b?.precioSugerido) || num(m?.precioSugerido) || null,
        stock: stock !== undefined && stock !== null && stock !== '' && Number.isFinite(Number(stock)) ? Number(stock) : null
      };
    });
}

module.exports = { num, tieneVariantes, cantidadLinea, totalLinea, subtotalLineas, escalarPrecios, opcionesVariantes };
