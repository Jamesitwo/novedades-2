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

  // --- SEMILLA TIENDA ---
  const adminUser = await prisma.usuario.findFirst({ where: { rol: 'admin' } });
  if (adminUser) {
    const tiendaProducts = [
      {
        nombre: 'Kit Taladro + Pulidora DEWALT 20V',
        descripcion: 'Set profesional inalámbrico con batería de litio y estuche. Ideal para trabajos de construcción y bricolaje.',
        categoria: 'Herramientas',
        precioVenta: 450000,
        precioProveedor: 280000,
        imagen: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 8,
        ofertaActiva: true,
        ofertaPrecio: 349000,
        ofertaHasta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        ventasSimuladas: 124,
        activo: true,
        destacado: true
      },
      {
        nombre: 'Audífonos Sony WH-1000XM5 Bluetooth',
        descripcion: 'Cancelación de ruido líder en la industria, 30h de batería. Calidad de audio premium para llamadas y música.',
        categoria: 'Electrónica',
        precioVenta: 890000,
        precioProveedor: 720000,
        imagen: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 3,
        ofertaActiva: true,
        ofertaPrecio: 749000,
        ofertaHasta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        ventasSimuladas: 89,
        activo: true,
        destacado: true
      },
      {
        nombre: 'Zapatillas Nike Air Max 270 React',
        descripcion: 'Comodidad máxima con amortiguación Air. Diseño moderno para uso diario y running ligero.',
        categoria: 'Calzado',
        precioVenta: 320000,
        precioProveedor: 190000,
        imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 15,
        ofertaActiva: false,
        ofertaPrecio: null,
        ofertaHasta: null,
        ventasSimuladas: 203,
        activo: true,
        destacado: true
      },
      {
        nombre: 'Crema Hidratante Facial Cetaphil 500ml',
        descripcion: 'Hidratación profunda para piel sensible. Sin fragancia, no comedogénico. Uso diario.',
        categoria: 'Belleza',
        precioVenta: 85000,
        precioProveedor: 52000,
        imagen: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 42,
        ofertaActiva: true,
        ofertaPrecio: 64900,
        ofertaHasta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        ventasSimuladas: 456,
        activo: true,
        destacado: false
      },
      {
        nombre: 'Smartwatch Samsung Galaxy Watch 6',
        descripcion: 'Monitoreo de salud avanzado, GPS, resistente al agua. Batería de larga duración.',
        categoria: 'Electrónica',
        precioVenta: 750000,
        precioProveedor: 580000,
        imagen: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 1,
        ofertaActiva: true,
        ofertaPrecio: 599000,
        ofertaHasta: new Date(Date.now() + 12 * 60 * 60 * 1000),
        ventasSimuladas: 67,
        activo: true,
        destacado: false
      },
      {
        nombre: 'Silla Ergonómica Oficina Ergohuman',
        descripcion: 'Soporte lumbar ajustable, reposacabezas, material mesh transpirable. 8h de uso continuo.',
        categoria: 'Oficina',
        precioVenta: 1200000,
        precioProveedor: 800000,
        imagen: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 6,
        ofertaActiva: false,
        ofertaPrecio: null,
        ofertaHasta: null,
        ventasSimuladas: 42,
        activo: true,
        destacado: false
      },
      {
        nombre: 'Camiseta Deportiva Under Armour Tech 2.0',
        descripcion: 'Tejido UA Tech con secado rápido. Diseño holgado, ideal para entrenamiento y uso casual.',
        categoria: 'Ropa',
        precioVenta: 95000,
        precioProveedor: 45000,
        imagen: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 28,
        ofertaActiva: false,
        ofertaPrecio: null,
        ofertaHasta: null,
        ventasSimuladas: 178,
        activo: true,
        destacado: false
      },
      {
        nombre: 'Organizador de Maquillaje con Espejo LED',
        descripcion: '3 niveles con iluminación LED regulable. Cajones amplios, diseño elegante para tocador.',
        categoria: 'Belleza',
        precioVenta: 180000,
        precioProveedor: 95000,
        imagen: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 4,
        ofertaActiva: true,
        ofertaPrecio: 139000,
        ofertaHasta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        ventasSimuladas: 91,
        activo: true,
        destacado: true
      },
      {
        nombre: 'Olla Eléctrica Multifunción Instant Pot 8L',
        descripcion: '14 funciones en 1: presión, vapor, arroz, yogurt, slow cook. Ahorra tiempo en la cocina.',
        categoria: 'Hogar',
        precioVenta: 380000,
        precioProveedor: 250000,
        imagen: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 11,
        ofertaActiva: false,
        ofertaPrecio: null,
        ofertaHasta: null,
        ventasSimuladas: 234,
        activo: true,
        destacado: false
      },
      {
        nombre: 'Set de Pesas Ajustables 20kg + Mancuernas',
        descripcion: 'Sistema rápido de ajuste de peso. Incluye base de almacenamiento. 2.5kg a 20kg por mancuerna.',
        categoria: 'Deportes',
        precioVenta: 550000,
        precioProveedor: 340000,
        imagen: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
        imagenes: [],
        linkCompra: 'https://wa.me/573000000000',
        stock: 0,
        ofertaActiva: false,
        ofertaPrecio: null,
        ofertaHasta: null,
        ventasSimuladas: 156,
        activo: true,
        destacado: false
      }
    ];

    for (const p of tiendaProducts) {
      await prisma.productoTienda.create({
        data: {
          ...p,
          createdById: adminUser.id,
          imagenes: p.imagenes || []
        }
      });
    }
    console.log('✅ Productos tienda creados:', tiendaProducts.length);
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