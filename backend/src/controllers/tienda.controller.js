const { prisma } = require('../prisma/client');
const { paginate } = require('../utils/paginate');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, categoria, search, destacado, oferta, orden = 'reciente' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { activo: true };

    if (categoria) where.categoria = categoria;
    if (destacado === 'true') where.destacado = true;
    if (oferta === 'true') {
      where.ofertaActiva = true;
      where.ofertaHasta = { gt: new Date() };
    }
    if (search) {
      const words = search.split(/\s+/).filter(Boolean);
      where.AND = words.map(word => ({
        OR: [
          { nombre: { contains: word, mode: 'insensitive' } },
          { descripcion: { contains: word, mode: 'insensitive' } },
          { categoria: { contains: word, mode: 'insensitive' } }
        ]
      }));
    }

    const orderMap = {
      'precio-asc': { precioVenta: 'asc' },
      'precio-desc': { precioVenta: 'desc' },
      'reciente': { createdAt: 'desc' },
      'ventas': { ventasSimuladas: 'desc' }
    };

    const [productos, total, categorias] = await Promise.all([
      prisma.productoTienda.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: orderMap[orden] || { createdAt: 'desc' }
      }),
      prisma.productoTienda.count({ where }),
      prisma.productoTienda.findMany({
        where: { activo: true },
        select: { categoria: true },
        distinct: ['categoria'],
        orderBy: { categoria: 'asc' }
      })
    ]);

    res.json({
      productos,
      categorias: categorias.map(c => c.categoria),
      pagination: paginate(productos, total, parseInt(page), parseInt(limit)).pagination
    });
  } catch (error) {
    console.error('Get tienda error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getDestacados = async (req, res) => {
  try {
    const productos = await prisma.productoTienda.findMany({
      where: { activo: true, destacado: true },
      orderBy: { updatedAt: 'desc' },
      take: 6
    });
    res.json(productos);
  } catch (error) {
    console.error('Get destacados error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getOfertas = async (req, res) => {
  try {
    const productos = await prisma.productoTienda.findMany({
      where: {
        activo: true,
        ofertaActiva: true,
        ofertaHasta: { gt: new Date() }
      },
      orderBy: { ofertaHasta: 'asc' }
    });
    res.json(productos);
  } catch (error) {
    console.error('Get ofertas error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await prisma.productoTienda.findUnique({ where: { id } });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const upsellIds = Array.isArray(producto.upsellIds) ? producto.upsellIds : [];
    let relacionados;
    if (upsellIds.length > 0) {
      relacionados = await prisma.productoTienda.findMany({
        where: { id: { in: upsellIds }, activo: true },
        take: 4
      });
      if (relacionados.length < 4) {
        const existentes = relacionados.map(r => r.id);
        const extra = await prisma.productoTienda.findMany({
          where: { activo: true, categoria: producto.categoria, id: { notIn: [producto.id, ...existentes] } },
          take: 4 - relacionados.length,
          orderBy: { ventasSimuladas: 'desc' }
        });
        relacionados = [...relacionados, ...extra];
      }
    } else {
      relacionados = await prisma.productoTienda.findMany({
        where: { activo: true, categoria: producto.categoria, id: { not: producto.id } },
        take: 4,
        orderBy: { ventasSimuladas: 'desc' }
      });
    }

    res.json({ ...producto, relacionados });
  } catch (error) {
    console.error('Get tienda by id error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden crear productos' });
    }

    const { nombre, descripcion, categoria, precioVenta, precioProveedor, imagen, imagenes, linkCompra, stock, ofertaActiva, ofertaPrecio, ofertaHasta, ventasSimuladas, activo, destacado, upsellIds } = req.body;

    if (!nombre || !categoria || !precioVenta) {
      return res.status(400).json({ error: 'nombre, categoria y precioVenta son requeridos' });
    }

    const producto = await prisma.productoTienda.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        categoria,
        precioVenta: parseFloat(precioVenta),
        precioProveedor: precioProveedor ? parseFloat(precioProveedor) : null,
        imagen: imagen || null,
        imagenes: imagenes || [],
        linkCompra: linkCompra || null,
        stock: parseInt(stock) || 0,
        ofertaActiva: ofertaActiva || false,
        ofertaPrecio: ofertaPrecio ? parseFloat(ofertaPrecio) : null,
        ofertaHasta: ofertaHasta ? new Date(ofertaHasta) : null,
        ventasSimuladas: parseInt(ventasSimuladas) || 0,
        activo: activo !== false,
        destacado: destacado || false,
        upsellIds: Array.isArray(upsellIds) ? upsellIds : [],
        createdById: req.usuario.id
      }
    });

    res.status(201).json(producto);
  } catch (error) {
    console.error('Create producto tienda error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden editar productos' });
    }

    const { id } = req.params;
    const { nombre, descripcion, categoria, precioVenta, precioProveedor, imagen, imagenes, linkCompra, stock, ofertaActiva, ofertaPrecio, ofertaHasta, ventasSimuladas, activo, destacado, upsellIds } = req.body;

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (categoria !== undefined) data.categoria = categoria;
    if (precioVenta !== undefined) data.precioVenta = parseFloat(precioVenta);
    if (precioProveedor !== undefined) data.precioProveedor = precioProveedor ? parseFloat(precioProveedor) : null;
    if (imagen !== undefined) data.imagen = imagen;
    if (imagenes !== undefined) data.imagenes = imagenes;
    if (linkCompra !== undefined) data.linkCompra = linkCompra;
    if (stock !== undefined) data.stock = parseInt(stock);
    if (ofertaActiva !== undefined) data.ofertaActiva = ofertaActiva;
    if (ofertaPrecio !== undefined) data.ofertaPrecio = ofertaPrecio ? parseFloat(ofertaPrecio) : null;
    if (ofertaHasta !== undefined) data.ofertaHasta = ofertaHasta ? new Date(ofertaHasta) : null;
    if (ventasSimuladas !== undefined) data.ventasSimuladas = parseInt(ventasSimuladas);
    if (activo !== undefined) data.activo = activo;
    if (destacado !== undefined) data.destacado = destacado;
    if (upsellIds !== undefined) data.upsellIds = Array.isArray(upsellIds) ? upsellIds : [];

    const producto = await prisma.productoTienda.update({ where: { id }, data });
    res.json(producto);
  } catch (error) {
    console.error('Update producto tienda error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins pueden eliminar productos' });
    }
    const { id } = req.params;
    await prisma.productoTienda.delete({ where: { id } });
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Delete producto tienda error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const toggleActivo = async (req, res) => {
  try {
    if (req.usuario?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo admins' });
    }
    const { id } = req.params;
    const actual = await prisma.productoTienda.findUnique({ where: { id } });
    if (!actual) return res.status(404).json({ error: 'Producto no encontrado' });
    const producto = await prisma.productoTienda.update({
      where: { id },
      data: { activo: !actual.activo }
    });
    res.json(producto);
  } catch (error) {
    console.error('Toggle activo error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, getDestacados, getOfertas, getById, create, update, remove, toggleActivo };

const procesarCompra = async (req, res) => {
  try {
    const { productoId, nombre, apellido, celular, direccion, ciudad, email, notas, cantidad } = req.body;
    if (!productoId || !nombre || !apellido || !celular || !direccion || !ciudad) {
      return res.status(400).json({ error: 'Faltan datos requeridos: nombre, apellido, celular, dirección y ciudad' });
    }

    const producto = await prisma.productoTienda.findUnique({ where: { id: productoId } });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    console.log('[TIENDA] Nueva compra:', {
      producto: producto.nombre,
      precio: producto.ofertaActiva && producto.ofertaPrecio ? producto.ofertaPrecio : producto.precioVenta,
      cliente: `${nombre} ${apellido}`,
      celular, ciudad, cantidad: cantidad || 1
    });

    try {
      const config = await prisma.configuracion.findFirst();
      if (config?.lucidbot_activo && config?.lucidbot_api_key) {
        const qty = parseInt(cantidad) || 1;
        const precio = producto.ofertaActiva && producto.ofertaPrecio ? producto.ofertaPrecio : producto.precioVenta;

        const actions = [
          { action: "add_tag", tag_name: config.lucidbot_tag_name || "pizdo_compra" }
        ];

        const fieldValues = typeof config.lucidbot_field_values === 'string'
          ? JSON.parse(config.lucidbot_field_values) : (config.lucidbot_field_values || []);
        const valueMap = {
          producto: producto.nombre,
          precio: String(precio),
          total: String(precio * qty),
          nombre, apellido, celular, ciudad, direccion,
          email: email || '',
          notas: notas || '',
          cantidad: String(qty)
        };

        fieldValues.forEach(fv => {
          if (fv.value_from && valueMap[fv.value_from] !== undefined) {
            actions.push({ action: "set_field_value", field_name: fv.field_name, value: valueMap[fv.value_from] });
          }
        });

        if (config.lucidbot_flow_id) {
          actions.push({ action: "send_flow", flow_id: config.lucidbot_flow_id });
        }

        const lucidbotBody = {
          phone: celular,
          email: email || '',
          first_name: nombre,
          last_name: apellido,
          gender: "male",
          actions
        };

        console.log('[LucidBot] Enviando contacto:', lucidbotBody.phone, lucidbotBody.first_name);

        fetch('https://panel.lucidbot.co/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-ACCESS-TOKEN': config.lucidbot_api_key },
          body: JSON.stringify(lucidbotBody)
        })
          .then(r => r.text())
          .then(r => console.log('[LucidBot] Respuesta:', r.slice(0, 200)))
          .catch(e => console.error('[LucidBot] Error:', e.message));
      }
    } catch (e) {
      console.error('[LucidBot] Error preparando datos:', e.message);
    }

    res.json({ ok: true, message: 'Pedido registrado correctamente. Te contactaremos pronto.' });
  } catch (error) {
    console.error('Procesar compra error:', error);
    res.status(500).json({ error: 'Error al procesar la compra' });
  }
};

module.exports.procesarCompra = procesarCompra;
