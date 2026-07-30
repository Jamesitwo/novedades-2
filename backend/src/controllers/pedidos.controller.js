const { prisma } = require('../prisma/client');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, metodoPago, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (estado) where.estado = estado;
    if (metodoPago) where.metodoPago = metodoPago;
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { celular: { contains: search, mode: 'insensitive' } },
        { productoNombre: { contains: search, mode: 'insensitive' } }
      ];
    }
    const [pedidos, total] = await Promise.all([
      prisma.pedidoTienda.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.pedidoTienda.count({ where })
    ]);
    res.json({ pedidos, total, pages: Math.ceil(total / parseInt(limit)), page: parseInt(page) });
  } catch (error) {
    console.error('Get pedidos error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const pedido = await prisma.pedidoTienda.findUnique({
      where: { id: req.params.id },
      include: { historial: { include: { usuario: { select: { id: true, nombre: true } } }, orderBy: { createdAt: 'desc' } } }
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(pedido);
  } catch (error) {
    console.error('Get pedido error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const updateEstado = async (req, res) => {
  try {
    const { estado, pagado } = req.body;
    const actual = await prisma.pedidoTienda.findUnique({ where: { id: req.params.id } });
    if (!actual) return res.status(404).json({ error: 'Pedido no encontrado' });

    const data = {};
    if (estado && estado !== actual.estado) {
      data.estado = estado;
      await prisma.historialPedidoTienda.create({
        data: { pedidoId: req.params.id, campo: 'estado', valorAnt: actual.estado, valorNuevo: estado, usuarioId: req.usuario.id }
      });
    }
    if (pagado !== undefined && pagado !== actual.pagado) {
      data.pagado = pagado;
      await prisma.historialPedidoTienda.create({
        data: { pedidoId: req.params.id, campo: 'pagado', valorAnt: String(actual.pagado), valorNuevo: String(pagado), usuarioId: req.usuario.id }
      });
    }
    if (Object.keys(data).length === 0) return res.json(actual);

    const pedido = await prisma.pedidoTienda.update({ where: { id: req.params.id }, data });
    res.json(pedido);
  } catch (error) {
    console.error('Update pedido error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    await prisma.pedidoTienda.delete({ where: { id: req.params.id } });
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    console.error('Delete pedido error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getById, updateEstado, remove };
