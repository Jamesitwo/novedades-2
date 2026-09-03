const { prisma } = require('../prisma/client');
const { importarPedidos, desimportarPedido } = require('../services/importador-pedidos.service');

const CONFIG_KEYS = ['lucidbotApiKey', 'botFieldPedidos', 'botFieldIntegracionPedidos'];

async function getTiendaZunto() {
  const tienda = await prisma.tienda.findUnique({ where: { slug: 'zunto' } });
  if (!tienda) {
    const err = new Error('La tienda Zunto no existe. Ejecuta la migracion de tiendas.');
    err.status = 404;
    throw err;
  }
  return tienda;
}

const getConfig = async (req, res) => {
  try {
    const tienda = await getTiendaZunto();
    const config = {};
    CONFIG_KEYS.forEach(k => { config[k] = tienda[k] || ''; });
    res.json({ tienda: tienda.nombre, slug: tienda.slug, config });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Error en el servidor' });
  }
};

const updateConfig = async (req, res) => {
  try {
    const tienda = await getTiendaZunto();
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

const listarLucidsalesPedidos = async (req, res) => {
  try {
    const { page = 1, itemsPerPage = 50, search = '', estado = '' } = req.query;
    const lucidsalesService = require('../services/lucidsales.service');
    const result = await lucidsalesService.getPedidos({
      page: Number(page),
      itemsPerPage: Number(itemsPerPage),
      search: String(search),
      filters: '[]'
    });

    const todos = Array.isArray(result) ? result : (result?.pedidos || result?.data || []);
    const totalRecords = result?.totalRecords ?? todos.length;
    const numPages = result?.numPages ?? Math.max(1, Math.ceil(totalRecords / Number(itemsPerPage)));

    const estadoNum = estado === '' || estado === null || estado === undefined ? null : Number(estado);

    const pedidos = todos
      .map(p => ({
        id: String(p.id ?? p.Id ?? p.idPedido ?? ''),
        idPedido: String(p.idPedido ?? p.id ?? ''),
        cliente: `${p.Nombre || ''} ${p.Apellido || ''}`.trim() || 'Sin nombre',
        movil: p.Movil || p.movil || '',
        total: Number(p.Total || 0) || 0,
        estadoPedido: Number(p.EstadoPedido ?? p.estadoPedido ?? 0),
        referencias: p.Referencias || p.referencias || ''
      }))
      .filter(p => p.id && (estadoNum === null || p.estadoPedido === estadoNum));

    res.json({ total: pedidos.length, totalRecords, numPages, pedidos });
  } catch (error) {
    console.error('[Zunto] listarLucidsalesPedidos error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al listar pedidos de LucidSales' });
  }
};

const importar = async (req, res) => {
  try {
    const tienda = await getTiendaZunto();
    const { pedidoIds } = req.body;
    if (!pedidoIds || !Array.isArray(pedidoIds) || pedidoIds.length === 0) {
      return res.status(400).json({ error: 'pedidoIds debe ser un array con al menos un pedido' });
    }
    const resumen = await importarPedidos(tienda, pedidoIds.map(String), req.usuario.id);
    res.json({ ok: true, ...resumen });
  } catch (error) {
    console.error('[Zunto] importar error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al importar' });
  }
};

const importaciones = async (req, res) => {
  try {
    const tienda = await getTiendaZunto();
    const logs = await prisma.importLogPedido.findMany({
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
    const tienda = await getTiendaZunto();
    const log = await prisma.importLogPedido.findFirst({
      where: { id: req.params.logId, tiendaId: tienda.id }
    });
    if (!log) return res.status(404).json({ error: 'Registro no encontrado' });
    const resumen = await importarPedidos(tienda, [log.lucidsalesPedidoId], req.usuario.id);
    res.json({ ok: true, ...resumen });
  } catch (error) {
    console.error('[Zunto] reintentar error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al reintentar' });
  }
};

const desimportar = async (req, res) => {
  try {
    const tienda = await getTiendaZunto();
    const log = await prisma.importLogPedido.findFirst({
      where: { id: req.params.logId, tiendaId: tienda.id }
    });
    if (!log) return res.status(404).json({ error: 'Registro no encontrado' });

    const errores = await desimportarPedido(tienda, log);
    if (errores.length > 0) {
      return res.status(502).json({
        ok: false,
        error: 'No se pudo eliminar de todos los bot fields',
        errores
      });
    }

    await prisma.importLogPedido.delete({ where: { id: log.id } });

    res.json({ ok: true, message: 'Pedido desimportado y eliminado de los bot fields' });
  } catch (error) {
    console.error('[Zunto] desimportar error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Error al desimportar' });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  listarLucidsalesPedidos,
  importar,
  importaciones,
  reintentar,
  desimportar,
  CONFIG_KEYS
};
