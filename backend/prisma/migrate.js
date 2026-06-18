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

  console.log('✅ Migraciones completadas');
}

main()
  .catch((e) => console.error('❌ Error en migración:', e))
  .finally(() => prisma.$disconnect());
