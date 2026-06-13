const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creando usuario admin inicial...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@novedades.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@novedades.com',
      password: hashedPassword,
      rol: 'admin',
      activo: true
    }
  });

  console.log('✅ Usuario admin creado:');
  console.log('   Email: admin@novedades.com');
  console.log('   Password: admin123');

  const operador = await prisma.usuario.upsert({
    where: { email: 'operador@novedades.com' },
    update: {},
    create: {
      nombre: 'Operador Test',
      email: 'operador@novedades.com',
      password: hashedPassword,
      rol: 'operador',
      activo: true
    }
  });

  console.log('✅ Usuario operador creado:');
  console.log('   Email: operador@novedades.com');
  console.log('   Password: admin123');

  console.log('\n📦 Creando datos de prueba...');

  const existente = await prisma.pedidoNovedad.findFirst({ where: { guia: 'SE123456789' } });
  if (!existente) {
    const pedidoNovedad = await prisma.pedidoNovedad.create({
      data: {
        nombre: 'Juan',
        apellido: 'Pérez',
        celular: '3001234567',
        producto: 'Laptop HP Pavilion 15',
        totalAPagar: 2500000,
        transportadora: 'Servientrega',
        guia: 'SE123456789',
        motivoNovedad: 'No atendido en domicilio',
        estado: 'novedad',
        createdById: admin.id
      }
    });
    console.log('✅ Novedad creada:', pedidoNovedad.id);
  } else {
    console.log('⏭ Novedad de prueba ya existe');
  }

  const existenteOficina = await prisma.pedidoOficina.findFirst({ where: { guia: 'INT987654321' } });
  if (!existenteOficina) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 5);

    const pedidoOficina = await prisma.pedidoOficina.create({
      data: {
        nombre: 'María',
        apellido: 'García',
        celular: '3109876543',
        producto: 'Audífonos Sony WH-1000XM4',
        transportadora: 'Interrapidisimo',
        guia: 'INT987654321',
        fechaLimite: fechaLimite,
        estado: 'pendiente_llamar',
        createdById: admin.id
      }
    });
    console.log('✅ Pedido oficina creado:', pedidoOficina.id);
  } else {
    console.log('⏭ Pedido oficina de prueba ya existe');
  }

  console.log('\n🎉 Seed completado! Database lista para pruebas.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });