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

  console.log('✅ Migraciones completadas');
}

main()
  .catch((e) => console.error('❌ Error en migración:', e))
  .finally(() => prisma.$disconnect());
