const { prisma } = require('../prisma/client');
const lucidsalesService = require('../services/lucidsales.service');
const { resolveTiendaId } = require('../utils/tienda');

const normalizar = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const mapearCiudadDepto = (nombreCiudad, nombreDepto) => {
  try {
    const deptos = require('../data/lucidsales_departamentos.json');
    const ciudades = require('../data/lucidsales_ciudades.json');
    const depto = deptos.find(d => normalizar(d.name) === normalizar(nombreDepto));
    const ciudad = ciudades.find(c => normalizar(c.name) === normalizar(nombreCiudad));
    return {
      departamentoId: depto?.id || 0,
      ciudadId: ciudad?.id || 0
    };
  } catch {
    return { departamentoId: 0, ciudadId: 0 };
  }
};

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, metodoPago, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tiendaId = await resolveTiendaId(req.query.tienda);
    const where = { tiendaId };
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
      include: {
        historial: { include: { usuario: { select: { id: true, nombre: true } } }, orderBy: { createdAt: 'desc' } },
        subidoPor: { select: { id: true, nombre: true } }
      }
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
    const data = {};
    if (estado) data.estado = estado;
    if (pagado !== undefined) data.pagado = pagado;
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

const cotizarDropi = async (req, res) => {
  try {
    const pedido = await prisma.pedidoTienda.findUnique({ where: { id: req.params.id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

    let items = Array.isArray(pedido.items) && pedido.items.length > 0 ? pedido.items : null;

    if (!items) {
      const prod = await prisma.productoTienda.findUnique({ where: { id: pedido.productoId } });
      items = [{
        productoId: pedido.productoId,
        productoNombre: pedido.productoNombre,
        dropiId: prod?.dropiId || null,
        lucidsalesId: prod?.lucidsalesId || null,
        cantidad: pedido.cantidad,
        precioUnitario: pedido.precioUnitario,
        envio: pedido.envio || 0
      }];
    }

    const sinDropi = items.filter(i => !i.lucidsalesId);
    if (sinDropi.length > 0) {
      return res.status(400).json({
        error: `El producto "${sinDropi[0].productoNombre}" no tiene ID de catálogo LucidSales. Re-importa el producto desde LucidSales o configura su ID.`
      });
    }

    const { departamentoId, ciudadId } = mapearCiudadDepto(pedido.ciudad, pedido.departamento);

    let lucidsalesPedidoId = pedido.lucidsalesPedidoId;
    if (!lucidsalesPedidoId) {
      const jsonProductos = items.map(i => ({
        product_id: i.lucidsalesId,
        price: i.precioUnitario,
        quantity: i.cantidad,
        variations: []
      }));
      const subTotal = items.reduce((s, i) => s + (i.precioUnitario * i.cantidad), 0);
      const refUnica = 'PIZDO-' + pedido.id.slice(0, 8);

      const creado = await lucidsalesService.createPedido({
        nombreCliente: pedido.nombre,
        apellidoCliente: pedido.apellido,
        emailCliente: pedido.email || '',
        telefonoCliente: '+57' + pedido.celular,
        direccionCliente: pedido.direccion,
        ciudadCliente: ciudadId,
        departamentoCliente: departamentoId,
        paisCliente: 47,
        json: jsonProductos,
        subTotal,
        costoEnvio: pedido.envio || 0,
        total: pedido.total,
        Referencias: refUnica + (pedido.notas ? ' - ' + pedido.notas : '')
      });

      if (creado && creado.ok === false) {
        return res.status(400).json({ error: creado.msg || creado.error || 'LucidSales rechazó la creación del pedido' });
      }

      lucidsalesPedidoId = creado?.pedido?.id || creado?.id || creado?.Id || creado?.pedidoId || creado?.data?.id;
      if (!lucidsalesPedidoId && creado?.pedido && typeof creado.pedido === 'string') {
        lucidsalesPedidoId = parseInt(creado.pedido, 10) || null;
      }

      if (!lucidsalesPedidoId) {
        try {
          const pedidosLS = await lucidsalesService.getPedidos({ search: refUnica, itemsPerPage: 3 });
          const match = pedidosLS?.pedidos?.[0];
          if (match?.id) lucidsalesPedidoId = match.id;
        } catch (e) {
          console.error('[Dropi] Fallback busqueda por referencia fallo:', e.message);
        }
      }

      if (!lucidsalesPedidoId) {
        console.error('[Dropi] Respuesta createPedido:', JSON.stringify(creado).slice(0, 800));
        return res.status(500).json({ error: 'Error al crear el pedido en LucidSales' });
      }

      await prisma.pedidoTienda.update({
        where: { id: pedido.id },
        data: { lucidsalesPedidoId: String(lucidsalesPedidoId) }
      });
    }

    const cotizacion = await lucidsalesService.cotizarEnvio(lucidsalesPedidoId, 'dropi');
    res.json({ ok: true, lucidsalesPedidoId: String(lucidsalesPedidoId), quotes: cotizacion?.quotes || cotizacion || [] });
  } catch (error) {
    console.error('Cotizar Dropi error:', error);
    res.status(500).json({ error: error.message || 'Error al cotizar envío Dropi' });
  }
};

const confirmarDropi = async (req, res) => {
  try {
    const pedido = await prisma.pedidoTienda.findUnique({ where: { id: req.params.id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (!pedido.lucidsalesPedidoId) {
      return res.status(400).json({ error: 'Primero cotiza el envío para crear el pedido en LucidSales' });
    }

    const { transportadora_id, transportadora } = req.body;
    if (!transportadora_id) {
      return res.status(400).json({ error: 'Selecciona una transportadora' });
    }

    const resultado = await lucidsalesService.confirmarIntegracion(pedido.lucidsalesPedidoId, transportadora_id);
    if (resultado && resultado.ok === false) {
      return res.status(400).json({ error: resultado.msg || resultado.error || 'Error al subir a Dropi' });
    }

    const actualizado = await prisma.pedidoTienda.update({
      where: { id: pedido.id },
      data: {
        transportadora: transportadora || null,
        estado: 'enviado',
        subidoPorId: req.usuario.id
      }
    });

    res.json({ ok: true, pedido: actualizado });
  } catch (error) {
    console.error('Confirmar Dropi error:', error);
    res.status(500).json({ error: error.message || 'Error al confirmar envío Dropi' });
  }
};

module.exports = { getAll, getById, updateEstado, remove, cotizarDropi, confirmarDropi };
