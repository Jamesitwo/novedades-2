const { prisma } = require('../prisma/client');

const getByProducto = async (req, res) => {
  try {
    const { productoId } = req.query;
    if (!productoId) {
      return res.status(400).json({ error: 'productoId requerido' });
    }
    const alertas = await prisma.alertaProducto.findMany({
      where: { productoId, activo: true },
      include: { createdBy: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alertas);
  } catch (error) {
    console.error('Get alertas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getAll = async (req, res) => {
  try {
    const alertas = await prisma.alertaProducto.findMany({
      where: { activo: true },
      include: { createdBy: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alertas);
  } catch (error) {
    console.error('Get all alertas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getByPedido = async (req, res) => {
  try {
    const { lucidsalesPedidoId } = req.params;
    const pedido = await prisma.pedidoVinculado.findUnique({
      where: { lucidsalesPedidoId: Number(lucidsalesPedidoId) },
      select: { jsonProductos: true }
    });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    let productos = [];
    try {
      productos = typeof pedido.jsonProductos === 'string'
        ? JSON.parse(pedido.jsonProductos)
        : (pedido.jsonProductos || []);
    } catch { productos = []; }

    const productIds = productos.map(p => String(p.product_id)).filter(Boolean);
    if (productIds.length === 0) {
      return res.json([]);
    }

    const alertas = await prisma.alertaProducto.findMany({
      where: { productoId: { in: productIds }, activo: true },
      include: { createdBy: { select: { id: true, nombre: true } } },
      orderBy: [{ tipo: 'asc' }, { createdAt: 'desc' }]
    });

    res.json(alertas);
  } catch (error) {
    console.error('Get alertas por pedido error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { productoId, productoNombre, mensaje, tipo } = req.body;
    if (!productoId || !productoNombre || !mensaje) {
      return res.status(400).json({ error: 'productoId, productoNombre y mensaje son requeridos' });
    }

    const alerta = await prisma.alertaProducto.create({
      data: { productoId, productoNombre, mensaje, tipo: tipo || 'warning', createdById: req.usuario.id },
      include: { createdBy: { select: { id: true, nombre: true } } }
    });

    res.status(201).json(alerta);
  } catch (error) {
    console.error('Create alerta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje, tipo, activo } = req.body;

    const data = {};
    if (mensaje !== undefined) data.mensaje = mensaje;
    if (tipo !== undefined) data.tipo = tipo;
    if (activo !== undefined) data.activo = activo;

    const alerta = await prisma.alertaProducto.update({
      where: { id },
      data,
      include: { createdBy: { select: { id: true, nombre: true } } }
    });

    res.json(alerta);
  } catch (error) {
    console.error('Update alerta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.alertaProducto.delete({ where: { id } });
    res.json({ message: 'Alerta eliminada' });
  } catch (error) {
    console.error('Delete alerta error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getByProducto, getAll, getByPedido, create, update, remove };
