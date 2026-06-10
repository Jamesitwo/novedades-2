const { prisma } = require('../prisma/client');

const getAll = async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden ver sesiones' });
    }

    const sesiones = await prisma.sesion.findMany({
      where: { activa: true },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } }
      },
      orderBy: { ultimaAct: 'desc' }
    });

    res.json(sesiones);
  } catch (error) {
    console.error('Get sesiones error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteSesion = async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden eliminar sesiones' });
    }

    const { id } = req.params;
    await prisma.sesion.update({
      where: { id },
      data: { activa: false }
    });

    res.json({ message: 'Sesión eliminada' });
  } catch (error) {
    console.error('Delete sesion error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const deleteAllForUsuario = async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden eliminar sesiones' });
    }

    const { usuarioId } = req.params;
    await prisma.sesion.updateMany({
      where: { usuarioId, activa: true },
      data: { activa: false }
    });

    res.json({ message: 'Sesiones eliminadas' });
  } catch (error) {
    console.error('Delete sesiones error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const heartbeat = async (req, res) => {
  try {
    const sesion = await prisma.sesion.findFirst({
      where: { usuarioId: req.usuario.id, activa: true },
      orderBy: { ultimaAct: 'desc' }
    });

    if (!sesion) {
      return res.status(404).json({ error: 'No hay sesión activa' });
    }

    const ahora = new Date();
    const diffMinutos = (ahora - new Date(sesion.ultimaAct)) / 60000;
    const minutosSumar = Math.min(Math.round(diffMinutos), 5);

    await prisma.sesion.update({
      where: { id: sesion.id },
      data: {
        ultimaAct: ahora,
        minutosActivos: sesion.minutosActivos + minutosSumar
      }
    });

    res.json({ ok: true, minutosActivos: sesion.minutosActivos + minutosSumar });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, deleteSesion, deleteAllForUsuario, heartbeat };