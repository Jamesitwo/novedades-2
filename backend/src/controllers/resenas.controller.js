const { prisma } = require('../prisma/client');

const getByProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const resenas = await prisma.resena.findMany({
      where: { productoTiendaId: productoId },
      orderBy: { createdAt: 'desc' }
    });

    const promedio = resenas.length > 0
      ? Math.round((resenas.reduce((s, r) => s + r.calificacion, 0) / resenas.length) * 10) / 10
      : 0;

    const distribucion = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    resenas.forEach(r => { if (distribucion[r.calificacion] !== undefined) distribucion[r.calificacion]++; });

    res.json({ resenas, promedio, total: resenas.length, distribucion });
  } catch (error) {
    console.error('Get resenas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { nombre, calificacion, comentario } = req.body;

    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    if (!calificacion || calificacion < 1 || calificacion > 5) return res.status(400).json({ error: 'Calificación debe ser 1-5' });

    const resena = await prisma.resena.create({
      data: {
        productoTiendaId: productoId,
        nombre: nombre.trim(),
        calificacion: parseInt(calificacion),
        comentario: comentario || null
      }
    });

    res.status(201).json(resena);
  } catch (error) {
    console.error('Create resena error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getByProducto, create };
