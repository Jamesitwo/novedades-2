// Lineas de producto de un pedido de LucidSales (campo `Json`). Mismas reglas
// que backend/src/utils/lineasPedido.js:
//   sin variantes: {product_id, price, quantity, variations: []}
//   con variantes: {product_id, price: null, quantity: null,
//                   variations: [{variation_id, price, quantity}]}

export function num(v, def = 0) {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export function tieneVariantes(it) {
  return Array.isArray(it?.variations) && it.variations.length > 0 &&
    it.variations.some(v => v && typeof v === 'object' && (v.price !== undefined || v.quantity !== undefined));
}

export function cantidadLinea(it) {
  if (tieneVariantes(it)) return it.variations.reduce((a, v) => a + num(v?.quantity, 1), 0);
  return num(it?.quantity, 1);
}

export function totalLinea(it) {
  if (tieneVariantes(it)) return it.variations.reduce((a, v) => a + num(v?.price) * num(v?.quantity, 1), 0);
  return num(it?.price) * num(it?.quantity, 1);
}

/**
 * Nombres de las variantes segun las observaciones que pone LucidSales al
 * crear el pedido ("2 x Árbol Plegable - Copa: Blanca; Tamaño: 150 cm"), en orden.
 */
export function nombresDeVariantes(observaciones) {
  let obs = observaciones;
  if (typeof obs === 'string') {
    try { obs = JSON.parse(obs); } catch { obs = []; }
  }
  const out = [];
  for (const o of Array.isArray(obs) ? obs : []) {
    const m = String(o?.desc ?? '').match(/^\s*\d+\s*x\s+.+?\s+-\s+(.+:.+)$/i);
    if (m) out.push(m[1].trim());
  }
  return out;
}
