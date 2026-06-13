const { prisma } = require('../prisma/client');

const getAll = async (req, res) => {
  try {
    const etiquetas = await prisma.etiqueta.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, color: true, createdById: true, createdAt: true }
    });
    res.json(etiquetas);
  } catch (error) {
    console.error('Get etiquetas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, color } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const etiqueta = await prisma.etiqueta.create({
      data: {
        nombre,
        color: color || '#6366f1',
        createdById: req.usuario.id
      },
      select: { id: true, nombre: true, color: true, createdAt: true }
    });

    res.status(201).json(etiqueta);
  } catch (error) {
    console.error('Create etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, color } = req.body;

    const existente = await prisma.etiqueta.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }

    if (req.usuario.rol !== 'admin' && existente.createdById !== req.usuario.id) {
      return res.status(403).json({ error: 'Solo puedes editar tus propias etiquetas' });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (color !== undefined) data.color = color;

    const etiqueta = await prisma.etiqueta.update({
      where: { id },
      data,
      select: { id: true, nombre: true, color: true, createdAt: true }
    });

    res.json(etiqueta);
  } catch (error) {
    console.error('Update etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const existente = await prisma.etiqueta.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ error: 'Etiqueta no encontrada' });
    }

    if (req.usuario.rol !== 'admin' && existente.createdById !== req.usuario.id) {
      return res.status(403).json({ error: 'Solo puedes eliminar tus propias etiquetas' });
    }

    await prisma.registroEtiqueta.deleteMany({ where: { etiquetaId: id } });
    await prisma.etiqueta.delete({ where: { id } });

    res.json({ message: 'Etiqueta eliminada' });
  } catch (error) {
    console.error('Delete etiqueta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, create, update, remove };
