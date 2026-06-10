const { prisma } = require('../prisma/client');

const getAll = async (req, res) => {
  try {
    const vistas = await prisma.vistaGuardada.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vistas);
  } catch (error) {
    console.error('Get vistas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, tipo, filtros, columnas } = req.body;

    const existente = await prisma.vistaGuardada.findFirst({
      where: { usuarioId: req.usuario.id, nombre }
    });

    if (existente) {
      return res.status(400).json({ error: 'Ya existe una vista con ese nombre' });
    }

    const vista = await prisma.vistaGuardada.create({
      data: {
        usuarioId: req.usuario.id,
        nombre,
        tipo,
        filtros: typeof filtros === 'string' ? filtros : JSON.stringify(filtros),
        columnas: columnas ? (typeof columnas === 'string' ? columnas : JSON.stringify(columnas)) : null
      }
    });

    res.status(201).json(vista);
  } catch (error) {
    console.error('Create vista error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const vista = await prisma.vistaGuardada.findUnique({ where: { id } });

    if (!vista) {
      return res.status(404).json({ error: 'Vista no encontrada' });
    }

    if (vista.usuarioId !== req.usuario.id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta vista' });
    }

    await prisma.vistaGuardada.delete({ where: { id } });
    res.json({ message: 'Vista eliminada' });
  } catch (error) {
    console.error('Delete vista error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, create, remove };