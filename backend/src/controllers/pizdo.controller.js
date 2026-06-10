const { prisma } = require('../prisma/client');

const getAll = async (req, res) => {
  try {
    const { potencial, categoria, search, orden = 'ventas-desc' } = req.query;

    const where = {};
    if (potencial) where.potencial = potencial;
    if (categoria) where.categoria = categoria;
    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { dropiId: { contains: search } }
      ];
    }

    const orderBy = {
      'ventas-desc': { ventas: 'desc' },
      'ventas-asc': { ventas: 'asc' },
      'nombre': { nombre: 'asc' },
      'reciente': { createdAt: 'desc' }
    };

    const [productos, todosProductos, todasCategorias] = await Promise.all([
      prisma.productoGanador.findMany({
        where,
        orderBy: orderBy[orden] || { ventas: 'desc' }
      }),
      prisma.productoGanador.findMany({ select: { potencial: true, ventas: true } }),
      prisma.productoGanador.findMany({
        select: { categoria: true },
        distinct: ['categoria'],
        orderBy: { categoria: 'asc' }
      })
    ]);

    const stats = {
      total: todosProductos.length,
      alto: todosProductos.filter(p => p.potencial === 'alto').length,
      medio: todosProductos.filter(p => p.potencial === 'medio').length,
      bajo: todosProductos.filter(p => p.potencial === 'bajo').length,
      ventasTotales: todosProductos.reduce((s, p) => s + p.ventas, 0)
    };

    res.json({
      productos,
      stats,
      categorias: todasCategorias.map(c => c.categoria)
    });
  } catch (error) {
    console.error('Get productos ganadores error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { dropiId, nombre, ventas, categoria, potencial, imagen, link } = req.body;

    if (!dropiId || !nombre || !categoria) {
      return res.status(400).json({ error: 'ID, nombre y categoría son requeridos' });
    }

    const producto = await prisma.productoGanador.create({
      data: {
        dropiId: String(dropiId),
        nombre,
        ventas: parseInt(ventas) || 0,
        categoria,
        potencial: potencial || 'medio',
        imagen: imagen || null,
        link: link || null,
        createdById: req.usuario.id
      }
    });

    res.status(201).json(producto);
  } catch (error) {
    console.error('Create producto ganador error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { dropiId, nombre, ventas, categoria, potencial, imagen, link } = req.body;

    const existente = await prisma.productoGanador.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const data = {};
    if (dropiId !== undefined) data.dropiId = String(dropiId);
    if (nombre !== undefined) data.nombre = nombre;
    if (ventas !== undefined) data.ventas = parseInt(ventas) || 0;
    if (categoria !== undefined) data.categoria = categoria;
    if (potencial !== undefined) data.potencial = potencial;
    if (imagen !== undefined) data.imagen = imagen;
    if (link !== undefined) data.link = link;

    const producto = await prisma.productoGanador.update({
      where: { id },
      data
    });

    res.json(producto);
  } catch (error) {
    console.error('Update producto ganador error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const existente = await prisma.productoGanador.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await prisma.productoGanador.delete({ where: { id } });

    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Delete producto ganador error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const bulkImport = async (req, res) => {
  try {
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de productos' });
    }

    const creados = [];
    for (const p of productos) {
      if (p.dropiId && p.nombre && p.categoria) {
        const producto = await prisma.productoGanador.create({
          data: {
            dropiId: String(p.dropiId),
            nombre: p.nombre,
            ventas: parseInt(p.ventas) || 0,
            categoria: p.categoria,
            potencial: p.potencial || 'medio',
            imagen: p.imagen || null,
            link: p.link || null,
            createdById: req.usuario.id
          }
        });
        creados.push(producto);
      }
    }

    res.status(201).json({ message: `${creados.length} productos importados`, total: creados.length });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, create, update, remove, bulkImport };
