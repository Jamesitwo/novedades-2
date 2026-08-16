const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function upsertTienda(nombre, slug) {
  return prisma.tienda.upsert({
    where: { slug },
    update: { nombre },
    create: { nombre, slug, activo: true }
  });
}

async function main() {
  console.log('🔧 Migracion de tiendas (multi-tienda)...');

  const pizdo = await upsertTienda('Pizdo', 'pizdo');
  const perfumes = await upsertTienda('Perfumes', 'perfumes');
  console.log('   ✅ Tiendas listas:', pizdo.nombre, 'y', perfumes.nombre);

  const prod = await prisma.productoTienda.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: pizdo.id }
  });
  console.log(`   ✅ Productos asignados a pizdo: ${prod.count}`);

  const ped = await prisma.pedidoTienda.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: pizdo.id }
  });
  console.log(`   ✅ Pedidos asignados a pizdo: ${ped.count}`);

  const res = await prisma.resena.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: pizdo.id }
  });
  console.log(`   ✅ Resenas asignadas a pizdo: ${res.count}`);

  console.log('✅ Migracion de tiendas completada');
}

main()
  .catch((e) => console.error('❌ Error en migracion de tiendas:', e))
  .finally(() => prisma.$disconnect());
