const { prisma } = require('../prisma/client');
const { importarProductos, desimportarProducto, BOT_FIELDS } = require('../services/importador-perfumes.service');

const CONFIG_KEYS = ['lucidbotApiKey', 'botFieldAdIds', 'botFieldCatalogo', 'botFieldIntegracion', 'botFieldMensajes', 'botFieldMultimedia'];

async function getTiendaPerfumes() {
  const tienda = await prisma.tienda.findUnique({ where: { slug: 'perfumes' } });
  if (!tienda) {
    const err = new Error('La tienda Perfumes no existe. Ejecuta la migracion de tiendas.');
    err.status = 404;
    throw err;
  }
  return tienda;
}

const getConfig = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const config = {};
    CONFIG_KEYS.forEach(k => { config[k] = tienda[k] || ''; });
    res.json({ tienda: tienda.nombre, slug: tienda.slug, config });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Error en el servidor' });
  }
};

const updateConfig = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const data = {};
    CONFIG_KEYS.forEach(k => {
      if (req.body[k] !== undefined) data[k] = req.body[k] === '' ? null : String(req.body[k]);
    });
    const updated = await prisma.tienda.update({ where: { id: tienda.id }, data });
    const config = {};
    CONFIG_KEYS.forEach(k => { config[k] = updated[k] || ''; });
    res.json({ ok: true, config });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Error en el servidor' });
  }
};

const listarLucidsalesProductos = async (req, res) => {
  try {
    const lucidsalesService = require('../services/lucidsales.service');
    const lsProductos = await lucidsalesService.getProductos();
    const todos = Array.isArray(lsProductos) ? lsProductos : (lsProductos?.productos || lsProductos?.data || []);

    const productos = todos.map(p => {
      const imagenes = [];
      if (Array.isArray(p.imagenes)) {
        p.imagenes.forEach(i => { if (typeof i === 'string' && i.startsWith('http')) imagenes.push(i); else if (i?.image) imagenes.push(i.image); });
      }
      const precio = p.precioMin ?? p.precioSugerido ?? p.precio ?? p.Precio ?? null;
      return {
        id: String(p.id ?? p.Id ?? ''),
        nombre: p.Nombre || p.nombre || 'Sin nombre',
        descripcion: (p.Descripcion || '').substring(0, 160),
        precio: precio != null ? Number(precio) : null,
        imagen: imagenes[0] || null
      };
    }).filter(p => p.id);

    res.json({ total: productos.length, productos });
  } catch (error) {
    console.error('[Perfumes] listarLucidsalesProductos error:', error.message);
    res.status(500).json({ error: error.message || 'Error al listar productos de LucidSales' });
  }
};

const importar = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const { productoIds } = req.body;
    if (productoIds && !Array.isArray(productoIds)) {
      return res.status(400).json({ error: 'productoIds debe ser un array' });
    }
    const resumen = await importarProductos(tienda, productoIds || [], req.usuario.id);
    res.json({ ok: true, ...resumen });
  } catch (error) {
    console.error('[Perfumes] importar error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al importar' });
  }
};

const importaciones = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const logs = await prisma.importLogProducto.findMany({
      where: { tiendaId: tienda.id },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json({ logs });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Error en el servidor' });
  }
};

const reintentar = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const log = await prisma.importLogProducto.findFirst({
      where: { id: req.params.logId, tiendaId: tienda.id }
    });
    if (!log) return res.status(404).json({ error: 'Registro no encontrado' });
    const resumen = await importarProductos(tienda, [log.lucidsalesProductoId], req.usuario.id);
    res.json({ ok: true, ...resumen });
  } catch (error) {
    console.error('[Perfumes] reintentar error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al reintentar' });
  }
};

const listarProductosLocales = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const productos = await prisma.productoTienda.findMany({
      where: { tiendaId: tienda.id },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json({ productos });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Error en el servidor' });
  }
};

const desimportar = async (req, res) => {
  try {
    const tienda = await getTiendaPerfumes();
    const { id } = req.params;

    const producto = await prisma.productoTienda.findFirst({
      where: { id, tiendaId: tienda.id }
    });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado en Perfumes' });
    }

    const errores = await desimportarProducto(tienda, producto);
    if (errores.length > 0) {
      return res.status(502).json({
        ok: false,
        error: 'No se pudo eliminar de todos los bot fields',
        errores
      });
    }

    await prisma.productoTienda.delete({ where: { id: producto.id } });

    if (producto.lucidsalesId) {
      await prisma.importLogProducto.deleteMany({
        where: { tiendaId: tienda.id, lucidsalesProductoId: producto.lucidsalesId }
      });
    }

    res.json({ ok: true, message: 'Producto desimportado y eliminado de los bot fields' });
  } catch (error) {
    console.error('[Perfumes] desimportar error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al desimportar' });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  listarLucidsalesProductos,
  importar,
  importaciones,
  reintentar,
  listarProductosLocales,
  desimportar,
  CONFIG_KEYS,
  BOT_FIELDS
};
