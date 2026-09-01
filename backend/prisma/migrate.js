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

  // Backfill resolucion implicita: entregadas/devolucion directas sin pasar por solucionado
  const implicitas = await prisma.pedidoNovedad.findMany({
    where: { estado: { in: ['entregado', 'devolucion'] }, solucionadoAt: null },
    select: { id: true, asignadoId: true, updatedAt: true }
  });
  for (const n of implicitas) {
    await prisma.pedidoNovedad.update({
      where: { id: n.id },
      data: { solucionadoAt: n.updatedAt, solucionadoPorId: n.asignadoId || null, solucionadoFuente: 'operador' }
    });
  }
  console.log(`   ✅ Backfill resolucion implicita (entregado/devolucion directos): ${implicitas.length} novedades`);

  // Backfill vecesResuelta: contador de resoluciones/re-resoluciones
  const resueltasSinContador = await prisma.pedidoNovedad.findMany({
    where: { solucionadoAt: { not: null }, vecesResuelta: 0 },
    select: { id: true }
  });
  const idsSinContador = resueltasSinContador.map(n => n.id);
  if (idsSinContador.length > 0) {
    const transiciones = await prisma.historialCambio.groupBy({
      by: ['registroId'],
      where: {
        tabla: 'pedidos_novedad',
        campo: 'estado',
        valorNuevo: { in: ['solucionado', 'entregado', 'devolucion'] },
        valorAnterior: { notIn: ['solucionado', 'entregado', 'devolucion'] },
        registroId: { in: idsSinContador }
      },
      _count: { _all: true }
    });
    let conHistorial = 0;
    for (const t of transiciones) {
      await prisma.pedidoNovedad.update({
        where: { id: t.registroId },
        data: { vecesResuelta: Math.max(1, t._count._all) }
      });
      conHistorial++;
    }
    const conTransiciones = new Set(transiciones.map(t => t.registroId));
    const sinTransiciones = idsSinContador.filter(id => !conTransiciones.has(id));
    const res = await prisma.pedidoNovedad.updateMany({
      where: { id: { in: sinTransiciones }, solucionadoAt: { not: null } },
      data: { vecesResuelta: 1 }
    });
    console.log(`   ✅ Backfill vecesResuelta: ${conHistorial} con historial, ${res.count} con valor 1`);
  }

  console.log('✅ Migraciones completadas');
}

main()
  .catch((e) => console.error('❌ Error en migración:', e))
  .finally(() => prisma.$disconnect());
