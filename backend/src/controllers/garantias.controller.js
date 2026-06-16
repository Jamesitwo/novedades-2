const { prisma } = require('../prisma/client');
const crypto = require('crypto');

const generateToken = () => crypto.randomBytes(16).toString('hex');

const getAll = async (req, res) => {
  try {
    const { estado, search } = req.query;
    const where = {};
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { clienteNombre: { contains: search, mode: 'insensitive' } },
        { producto: { contains: search, mode: 'insensitive' } },
        { linkToken: { contains: search } }
      ];
    }

    const garantias = await prisma.garantia.findMany({
      where,
      include: { creadoPor: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const stats = {
      total: await prisma.garantia.count(),
      esperando: await prisma.garantia.count({ where: { estado: 'esperando' } }),
      pendiente: await prisma.garantia.count({ where: { estado: 'pendiente' } }),
      revisada: await prisma.garantia.count({ where: { estado: 'revisada' } }),
      aprobada: await prisma.garantia.count({ where: { estado: 'aprobada' } }),
      rechazada: await prisma.garantia.count({ where: { estado: 'rechazada' } })
    };

    res.json({ garantias, stats });
  } catch (error) {
    console.error('Get garantias error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const garantia = await prisma.garantia.findUnique({
      where: { id },
      include: { creadoPor: { select: { id: true, nombre: true } } }
    });
    if (!garantia) return res.status(404).json({ error: 'Garantía no encontrada' });
    res.json(garantia);
  } catch (error) {
    console.error('Get garantia error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const checkToken = async (req, res) => {
  try {
    const { token } = req.params;
    const garantia = await prisma.garantia.findUnique({ where: { linkToken: token } });

    if (!garantia) return res.status(404).json({ error: 'Link no encontrado' });
    if (new Date() > new Date(garantia.fechaExpiracion)) return res.status(410).json({ error: 'Este link ha expirado' });
    if (garantia.estado !== 'esperando') return res.status(400).json({ error: 'Esta garantía ya fue registrada' });

    res.json({ valid: true, linkToken: token });
  } catch (error) {
    console.error('Check token error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, producto, telefono, conversacionLink, precio } = req.body;

    if (!telefono) return res.status(400).json({ error: 'El teléfono es requerido' });
    if (!conversacionLink) return res.status(400).json({ error: 'El link de conversación es requerido' });

    const token = generateToken();
    const fechaExpiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const garantia = await prisma.garantia.create({
      data: {
        linkToken: token,
        clienteNombre: nombre || null,
        producto: producto || null,
        telefono,
        conversacionLink,
        precio: precio ? parseFloat(precio) : null,
        fechaExpiracion,
        creadoPorId: req.usuario.id
      },
      include: { creadoPor: { select: { id: true, nombre: true } } }
    });

    res.status(201).json({
      ...garantia,
      registroUrl: `${process.env.FRONTEND_URL || ''}/garantias/registro/${garantia.linkToken}`
    });
  } catch (error) {
    console.error('Create garantia error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const registrar = async (req, res) => {
  try {
    const { token } = req.params;
    const { clienteNombre, producto, descripcion, fotos, videoUrl } = req.body;

    const garantia = await prisma.garantia.findUnique({ where: { linkToken: token } });
    if (!garantia) return res.status(404).json({ error: 'Link no encontrado' });
    if (new Date() > new Date(garantia.fechaExpiracion)) return res.status(410).json({ error: 'Este link ha expirado' });
    if (garantia.estado !== 'esperando') return res.status(400).json({ error: 'Esta garantía ya fue registrada' });

    if (!clienteNombre) return res.status(400).json({ error: 'El nombre del cliente es requerido' });
    if (!videoUrl) return res.status(400).json({ error: 'El video es obligatorio' });

    const updated = await prisma.garantia.update({
      where: { id: garantia.id },
      data: {
        clienteNombre,
        producto: producto || garantia.producto,
        descripcion: descripcion || null,
        fotos: JSON.stringify(fotos || []),
        videoUrl,
        estado: 'pendiente'
      }
    });

    res.json({ message: 'Garantía registrada correctamente', id: updated.id });
  } catch (error) {
    console.error('Registrar garantia error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['pendiente', 'revisada', 'aprobada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const garantia = await prisma.garantia.update({
      where: { id },
      data: { estado },
      include: { creadoPor: { select: { id: true, nombre: true } } }
    });

    res.json(garantia);
  } catch (error) {
    console.error('Cambiar estado garantia error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.garantia.delete({ where: { id } });
    res.json({ message: 'Garantía eliminada' });
  } catch (error) {
    console.error('Delete garantia error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, create, registrar, cambiarEstado, remove, checkToken };
