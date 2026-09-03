const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ESTADO_LABELS = {
  novedad: 'novedad', contactado: 'contactado', solucionado: 'solucionado',
  entregado: 'entregado', devolucion: 'devolución', cancelado: 'cancelado',
  pendiente_llamar: 'pendiente por llamar', va_a_recoger: 'va a recoger',
  no_va_a_recoger: 'no va a recoger', pendiente: 'pendiente', enviado: 'enviado', pagado: 'pagado'
};

function label(estado) {
  return ESTADO_LABELS[estado] || estado;
}

function desc(anterior, nuevo) {
  if (['solucionado', 'entregado', 'devolucion', 'va_a_recoger'].includes(nuevo)) {
    return `Resuelto → ${label(nuevo)}`;
  }
  if (nuevo === 'novedad' && anterior !== 'novedad') {
    return 'Reabierta como novedad';
  }
  return `${label(anterior || 'sin estado')} → ${label(nuevo)}`;
}

async function main() {
  console.log('🔧 Ejecutando backfill de bitácora...');

  const existentes = await prisma.actividadLog.findMany({
    where: { dedupeKey: { not: null } },
    select: { dedupeKey: true }
  });
  const keys = new Set(existentes.map(e => e.dedupeKey));
  let creados = 0;
  const filas = [];

  const historialEstado = await prisma.historialCambio.findMany({
    where: { campo: 'estado', tabla: { in: ['pedidos_novedad', 'pedidos_oficina'] } },
    orderBy: { createdAt: 'asc' }
  });

  for (const h of historialEstado) {
    if (!h.valorNuevo || h.valorAnterior === h.valorNuevo) continue;
    const dedupeKey = `h:${h.id}`;
    if (keys.has(dedupeKey)) continue;
    const esNovedad = h.tabla === 'pedidos_novedad';
    filas.push({
      dedupeKey,
      tipo: esNovedad ? 'estado_novedad' : 'estado_oficina',
      entidad: esNovedad ? 'novedad' : 'oficina',
      registroId: h.registroId,
      operadorId: h.usuarioId,
      cliente: h.clienteNombre,
      valorAnterior: h.valorAnterior,
      valorNuevo: h.valorNuevo,
      descripcion: desc(h.valorAnterior, h.valorNuevo),
      createdAt: h.createdAt
    });
    keys.add(dedupeKey);
    creados++;
  }
  console.log(`   ✅ Cambios de estado desde historial: ${creados}`);

  const conHistorialResolucion = new Set(
    historialEstado
      .filter(h => h.tabla === 'pedidos_novedad' && ['solucionado', 'entregado', 'devolucion'].includes(h.valorNuevo))
      .map(h => h.registroId)
  );

  const novedadesSol = await prisma.pedidoNovedad.findMany({
    where: { solucionadoAt: { not: null } },
    select: { id: true, solucionadoAt: true, solucionadoPorId: true, nombre: true, apellido: true, guia: true, producto: true, totalAPagar: true }
  });
  let solBackfill = 0;
  for (const n of novedadesSol) {
    const dedupeKey = `sol:${n.id}`;
    if (keys.has(dedupeKey) || conHistorialResolucion.has(n.id)) continue;
    filas.push({
      dedupeKey,
      tipo: 'estado_novedad',
      entidad: 'novedad',
      registroId: n.id,
      operadorId: n.solucionadoPorId || null,
      cliente: `${n.nombre} ${n.apellido}`.trim() || null,
      valorAnterior: null,
      valorNuevo: 'solucionado',
      descripcion: 'Resuelto → solucionado',
      detalle: JSON.stringify({ guia: n.guia, producto: n.producto, valor: n.totalAPagar, backfill: true }),
      createdAt: n.solucionadoAt
    });
    keys.add(dedupeKey);
    creados++;
    solBackfill++;
  }
  console.log(`   ✅ Novedades solucionadas sin historial: ${solBackfill}`);

  const vinculadosSubidos = await prisma.pedidoVinculado.findMany({
    where: { subidoPorId: { not: null } },
    select: { lucidsalesPedidoId: true, subidoPorId: true, nombreCliente: true, apellidoCliente: true, updatedAt: true }
  });
  for (const v of vinculadosSubidos) {
    const dedupeKey = `sub:${v.lucidsalesPedidoId}`;
    if (keys.has(dedupeKey)) continue;
    filas.push({
      dedupeKey,
      tipo: 'pedido_subido',
      entidad: 'pedido_lucidsales',
      registroId: String(v.lucidsalesPedidoId),
      operadorId: v.subidoPorId,
      cliente: v.nombreCliente ? `${v.nombreCliente} ${v.apellidoCliente || ''}`.trim() : null,
      descripcion: 'Pedido subido a Dropi',
      detalle: JSON.stringify({ pedidoVinculadoId: v.lucidsalesPedidoId, backfill: true }),
      createdAt: v.updatedAt
    });
    keys.add(dedupeKey);
    creados++;
  }
  console.log(`   ✅ Pedidos LucidSales subidos: ${vinculadosSubidos.length}`);

  const tiendaSubidos = await prisma.pedidoTienda.findMany({
    where: { subidoPorId: { not: null } },
    select: { id: true, subidoPorId: true, nombre: true, apellido: true, transportadora: true, productoNombre: true, total: true, updatedAt: true }
  });
  for (const t of tiendaSubidos) {
    const dedupeKey = `subT:${t.id}`;
    if (keys.has(dedupeKey)) continue;
    filas.push({
      dedupeKey,
      tipo: 'pedido_subido',
      entidad: 'pedido_tienda',
      registroId: t.id,
      operadorId: t.subidoPorId,
      cliente: `${t.nombre} ${t.apellido || ''}`.trim(),
      descripcion: `Pedido subido a ${t.transportadora || 'Dropi'}`,
      detalle: JSON.stringify({ transportadora: t.transportadora, producto: t.productoNombre, valor: t.total, backfill: true }),
      createdAt: t.updatedAt
    });
    keys.add(dedupeKey);
    creados++;
  }
  console.log(`   ✅ Pedidos de tienda subidos: ${tiendaSubidos.length}`);

  // Backfill subidoAt: subidas históricas sin timestamp exacto → updatedAt
  const sinSubidoAtLS = await prisma.pedidoVinculado.findMany({
    where: { subidoPorId: { not: null }, subidoAt: null },
    select: { lucidsalesPedidoId: true, updatedAt: true }
  });
  for (const v of sinSubidoAtLS) {
    await prisma.pedidoVinculado.updateMany({
      where: { lucidsalesPedidoId: v.lucidsalesPedidoId, subidoAt: null },
      data: { subidoAt: v.updatedAt }
    });
  }
  const sinSubidoAtT = await prisma.pedidoTienda.findMany({
    where: { subidoPorId: { not: null }, subidoAt: null },
    select: { id: true, updatedAt: true }
  });
  for (const t of sinSubidoAtT) {
    await prisma.pedidoTienda.updateMany({
      where: { id: t.id, subidoAt: null },
      data: { subidoAt: t.updatedAt }
    });
  }
  console.log(`   ✅ subidoAt backfilleado: ${sinSubidoAtLS.length} LucidSales, ${sinSubidoAtT.length} tienda`);

  const registrosEtiqueta = await prisma.registroEtiqueta.findMany({
    include: { etiqueta: { select: { nombre: true, color: true } } }
  });

  const idsNov = [...new Set(registrosEtiqueta.filter(r => r.tabla === 'pedidos_novedad').map(r => r.registroId))];
  const idsOfi = [...new Set(registrosEtiqueta.filter(r => r.tabla === 'pedidos_oficina').map(r => r.registroId))];
  const idsVin = [...new Set(registrosEtiqueta.filter(r => r.tabla === 'pedidos_vinculados').map(r => r.registroId))].map(Number).filter(Boolean);

  const [novs, ofis, vins] = await Promise.all([
    idsNov.length ? prisma.pedidoNovedad.findMany({ where: { id: { in: idsNov } }, select: { id: true, nombre: true, apellido: true } }) : [],
    idsOfi.length ? prisma.pedidoOficina.findMany({ where: { id: { in: idsOfi } }, select: { id: true, nombre: true, apellido: true } }) : [],
    idsVin.length ? prisma.pedidoVinculado.findMany({ where: { lucidsalesPedidoId: { in: idsVin } }, select: { lucidsalesPedidoId: true, nombreCliente: true, apellidoCliente: true } }) : []
  ]);

  const mapaNov = new Map(novs.map(n => [n.id, n]));
  const mapaOfi = new Map(ofis.map(o => [o.id, o]));
  const mapaVin = new Map(vins.map(v => [String(v.lucidsalesPedidoId), v]));

  const entidadPorTabla = {
    pedidos_novedad: 'novedad',
    pedidos_oficina: 'oficina',
    pedidos_vinculados: 'pedido_lucidsales'
  };

  for (const r of registrosEtiqueta) {
    const dedupeKey = `etq:${r.id}`;
    if (keys.has(dedupeKey)) continue;
    let cliente = null;
    if (r.tabla === 'pedidos_novedad' && mapaNov.has(r.registroId)) {
      const n = mapaNov.get(r.registroId);
      cliente = `${n.nombre} ${n.apellido}`.trim() || null;
    } else if (r.tabla === 'pedidos_oficina' && mapaOfi.has(r.registroId)) {
      const o = mapaOfi.get(r.registroId);
      cliente = `${o.nombre} ${o.apellido}`.trim() || null;
    } else if (r.tabla === 'pedidos_vinculados' && mapaVin.has(r.registroId)) {
      const v = mapaVin.get(r.registroId);
      cliente = v.nombreCliente ? `${v.nombreCliente} ${v.apellidoCliente || ''}`.trim() : null;
    }
    filas.push({
      dedupeKey,
      tipo: 'etiqueta',
      entidad: entidadPorTabla[r.tabla] || r.tabla,
      registroId: r.registroId,
      operadorId: null,
      cliente,
      descripcion: `Etiqueta: ${r.etiqueta?.nombre || 'Desconocida'}`,
      detalle: JSON.stringify({ etiqueta: r.etiqueta?.nombre || null, color: r.etiqueta?.color || null, backfill: true }),
      createdAt: r.createdAt
    });
    keys.add(dedupeKey);
    creados++;
  }
  console.log(`   ✅ Etiquetas: ${registrosEtiqueta.length}`);

  if (filas.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < filas.length; i += CHUNK) {
      await prisma.actividadLog.createMany({ data: filas.slice(i, i + CHUNK) });
    }
  }

  console.log(`   ✅ Bitácora backfilleada: ${creados} eventos creados`);
}

main()
  .catch(e => { console.error('Migrate bitacora error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
