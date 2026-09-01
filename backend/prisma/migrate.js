const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Ejecutando migraciones de datos...');

  const novedadesCanceladas = await prisma.pedidoNovedad.updateMany({
    where: { estado: 'cancelado' },
    data: { estado: 'devolucion' }
  });
  console.log(`   ✅ Novedades cancelado→devolucion: ${novedadesCanceladas.count}`);

  const oficinaNoRecoger = await prisma.pedidoOficina.updateMany({
    where: { estado: 'no_va_a_recoger' },
    data: { estado: 'devolucion' }
  });
  console.log(`   ✅ Oficina no_va_a_recoger→devolucion: ${oficinaNoRecoger.count}`);

  const productosSinSlug = await prisma.productoTienda.findMany({
    where: { slug: null },
    select: { id: true, nombre: true }
  });
  for (const p of productosSinSlug) {
    const slug = p.nombre
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80);
    try {
      await prisma.productoTienda.update({ where: { id: p.id }, data: { slug } });
    } catch {
      await prisma.productoTienda.update({ where: { id: p.id }, data: { slug: slug + '-' + p.id.substring(0, 6) } });
    }
  }
  console.log(`   ✅ Slugs generados: ${productosSinSlug.length} productos`);

  // Backfill solucionado* (metricas persistentes de novedades)
  const historialSol = await prisma.historialCambio.findMany({
    where: { tabla: 'pedidos_novedad', campo: 'estado', valorNuevo: 'solucionado' },
    orderBy: { createdAt: 'asc' },
    select: { registroId: true, createdAt: true, usuarioId: true }
  });
  const primerSolucionado = new Map();
  for (const h of historialSol) {
    if (!primerSolucionado.has(h.registroId)) primerSolucionado.set(h.registroId, h);
  }
  let backfillHistorial = 0;
  for (const [registroId, h] of primerSolucionado) {
    const res = await prisma.pedidoNovedad.updateMany({
      where: { id: registroId, solucionadoAt: null },
      data: { solucionadoAt: h.createdAt, solucionadoPorId: h.usuarioId || null, solucionadoFuente: 'operador' }
    });
    backfillHistorial += res.count;
  }
  console.log(`   ✅ Backfill solucionado* desde historial: ${backfillHistorial} novedades`);

  const solucionadasActuales = await prisma.pedidoNovedad.findMany({
    where: { estado: 'solucionado', solucionadoAt: null },
    select: { id: true, asignadoId: true, updatedAt: true }
  });
  for (const n of solucionadasActuales) {
    await prisma.pedidoNovedad.update({
      where: { id: n.id },
      data: { solucionadoAt: n.updatedAt, solucionadoPorId: n.asignadoId || null, solucionadoFuente: 'operador' }
    });
  }
  console.log(`   ✅ Backfill solucionado* de solucionadas actuales: ${solucionadasActuales.length} novedades`);

  // Backfill reabiertoAt: novedades reabiertas (solucionadas que volvieron a estado novedad)
  const reabiertas = await prisma.pedidoNovedad.findMany({
    where: { estado: 'novedad', solucionadoAt: { not: null }, reabiertoAt: null },
    select: { id: true, updatedAt: true }
  });
  for (const n of reabiertas) {
    await prisma.pedidoNovedad.update({
      where: { id: n.id },
      data: { reabiertoAt: n.updatedAt }
    });
  }
  console.log(`   ✅ Backfill reabiertoAt: ${reabiertas.length} novedades reabiertas`);

  console.log('✅ Migraciones completadas');
}

main()
  .catch((e) => console.error('❌ Error en migración:', e))
  .finally(() => prisma.$disconnect());
