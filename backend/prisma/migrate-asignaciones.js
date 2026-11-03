const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Backfill: copia el dueno registrado en pedidos_vinculados.asignado_id
// a la tabla propia de asignaciones (asignaciones_pedido).
// Idempotente: solo inserta pedidos que aun no tienen fila propia.
async function main() {
  console.log('🔧 Backfill de asignaciones de pedidos (tabla propia)...');

  const vinculados = await prisma.pedidoVinculado.findMany({
    where: { asignadoId: { not: null } },
    select: { lucidsalesPedidoId: true, asignadoId: true, tiendaId: true, createdById: true, estadoPedido: true }
  });

  if (vinculados.length === 0) {
    console.log('   ℹ️  Sin asignaciones que migrar');
    return;
  }

  const existentes = await prisma.asignacionPedido.findMany({ select: { lucidsalesPedidoId: true } });
  const existentesSet = new Set(existentes.map(e => e.lucidsalesPedidoId));

  const nuevos = vinculados
    .filter(v => !existentesSet.has(v.lucidsalesPedidoId))
    .map(v => ({
      lucidsalesPedidoId: v.lucidsalesPedidoId,
      asignadoId: v.asignadoId,
      tiendaId: v.tiendaId || null,
      createdById: v.createdById || null,
      origen: 'migracion',
      // copia del estado: el filtro "asignados a X" pagina con ella
      estadoPedido: v.estadoPedido ?? null
    }));

  if (nuevos.length === 0) {
    console.log(`   ✅ Todo migrado (${existentesSet.size} ya existian)`);
    return;
  }

  // createMany por lotes para no pasar el limite de parametros de Postgres
  const LOTE = 500;
  let creados = 0;
  for (let i = 0; i < nuevos.length; i += LOTE) {
    const lote = nuevos.slice(i, i + LOTE);
    const r = await prisma.asignacionPedido.createMany({ data: lote, skipDuplicates: true });
    creados += r.count;
  }

  console.log(`   ✅ ${creados} asignaciones migradas de ${vinculados.length} con dueno`);
}

main()
  .catch((e) => {
    console.error('❌ migrate-asignaciones fallo:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
