const { prisma } = require('../prisma/client');

const getAll = async (req, res) => {
  try {
    const { estado, asignadoId } = req.query;
    const where = {};
    if (estado) where.estado = estado;
    if (asignadoId) where.asignadoId = asignadoId;

    const tareas = await prisma.tarea.findMany({
      where,
      include: {
        creadoPor: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      },
      orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }]
    });

    const estados = ['pendiente', 'en_progreso', 'revision', 'completada', 'cancelada'];
    const columnas = estados.map(est => ({
      estado: est,
      tareas: tareas.filter(t => t.estado === est)
    }));
    columnas[0].label = 'Pendiente';
    columnas[1].label = 'En Progreso';
    columnas[2].label = 'Revisión';
    columnas[3].label = 'Completadas';
    columnas[4].label = 'Canceladas';

    res.json({ columnas, todas: tareas });
  } catch (error) {
    console.error('Get tareas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const tarea = await prisma.tarea.findUnique({
      where: { id },
      include: {
        creadoPor: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true } }
      }
    });
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  } catch (error) {
    console.error('Get tarea error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { titulo, descripcion, prioridad, asignadoId, fechaLimite } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es requerido' });
    if (prioridad && !['baja', 'media', 'alta', 'urgente'].includes(prioridad)) return res.status(400).json({ error: 'Prioridad inválida' });

    const tarea = await prisma.tarea.create({
      data: {
        titulo,
        descripcion: descripcion || null,
        prioridad: prioridad || 'media',
        asignadoId: asignadoId || null,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        origenTipo: 'manual',
        creadoPorId: req.usuario.id
      },
      include: { creadoPor: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true } } }
    });
    res.status(201).json(tarea);
  } catch (error) {
    console.error('Create tarea error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, prioridad, asignadoId, fechaLimite } = req.body;

    const data = {};
    if (titulo !== undefined) data.titulo = titulo;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (prioridad !== undefined) data.prioridad = prioridad;
    if (asignadoId !== undefined) data.asignadoId = asignadoId;
    if (fechaLimite !== undefined) data.fechaLimite = fechaLimite ? new Date(fechaLimite) : null;

    const tarea = await prisma.tarea.update({
      where: { id },
      data,
      include: { creadoPor: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true } } }
    });
    res.json(tarea);
  } catch (error) {
    console.error('Update tarea error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['pendiente', 'en_progreso', 'revision', 'completada', 'cancelada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const tarea = await prisma.tarea.update({
      where: { id },
      data: { estado },
      include: { creadoPor: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true } } }
    });
    res.json(tarea);
  } catch (error) {
    console.error('Cambiar estado tarea error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tarea.delete({ where: { id } });
    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    console.error('Delete tarea error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, create, update, cambiarEstado, remove };
