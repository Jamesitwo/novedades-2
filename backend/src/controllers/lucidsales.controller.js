const lucidsalesService = require('../services/lucidsales.service');

const getPedidos = async (req, res) => {
  try {
    const { page, itemsPerPage, search, filters } = req.query;
    const result = await lucidsalesService.getPedidos({ page, itemsPerPage, search, filters });
    res.json(result);
  } catch (error) {
    console.error('LucidSales getPedidos error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener pedidos' });
  }
};

const getPedidoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await lucidsalesService.getPedidoById(id);
    res.json(result);
  } catch (error) {
    console.error('LucidSales getPedidoById error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener pedido' });
  }
};

const updatePedido = async (req, res) => {
  try {
    const result = await lucidsalesService.updatePedido(req.body);
    if (result && result.ok === false) {
      return res.status(400).json({ error: result.msg || result.error || 'Error al actualizar en LucidSales' });
    }
    res.json(result);
  } catch (error) {
    console.error('LucidSales updatePedido error:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar pedido' });
  }
};

const createPedido = async (req, res) => {
  try {
    const result = await lucidsalesService.createPedido(req.body);
    if (result && result.ok === false) {
      return res.status(400).json({ error: result.msg || result.error || 'Error al crear en LucidSales' });
    }
    res.json(result);
  } catch (error) {
    console.error('LucidSales createPedido error:', error);
    res.status(500).json({ error: error.message || 'Error al crear pedido' });
  }
};

const cotizarEnvio = async (req, res) => {
  try {
    const { pedidoId, carrier } = req.body;
    const result = await lucidsalesService.cotizarEnvio(pedidoId, carrier || 'dropi');
    res.json(result);
  } catch (error) {
    console.error('LucidSales cotizarEnvio error:', error);
    res.status(500).json({ error: error.message || 'Error al cotizar envío' });
  }
};

const confirmarEnvio = async (req, res) => {
  try {
    const { pedidoId, carrier } = req.body;
    if (!carrier) return res.status(400).json({ error: 'carrier es requerido' });
    const result = await lucidsalesService.confirmarIntegracion(pedidoId, carrier);
    res.json(result);
  } catch (error) {
    console.error('LucidSales confirmarEnvio error:', error);
    res.status(500).json({ error: error.message || 'Error al confirmar envío' });
  }
};

const validateAddress = async (req, res) => {
  try {
    const { direccion, ciudad, departamento, pais } = req.body;
    const result = await lucidsalesService.validateAddress(direccion, ciudad, departamento, pais || 47);
    res.json(result);
  } catch (error) {
    console.error('LucidSales validateAddress error:', error);
    res.status(500).json({ error: error.message || 'Error al validar dirección' });
  }
};

const getProductos = async (req, res) => {
  try {
    const result = await lucidsalesService.getProductos();
    res.json(result);
  } catch (error) {
    console.error('LucidSales getProductos error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener productos' });
  }
};

const getFiltersData = async (req, res) => {
  try {
    const result = await lucidsalesService.getFiltersData();
    res.json(result);
  } catch (error) {
    console.error('LucidSales getFiltersData error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener filtros' });
  }
};

const getPaises = async (req, res) => {
  try {
    const result = await lucidsalesService.getPaises();
    res.json(result);
  } catch (error) {
    console.error('LucidSales getPaises error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener países' });
  }
};

const getDepartamentos = async (req, res) => {
  try {
    const { paisId } = req.query;
    const result = await lucidsalesService.getDepartamentos(paisId || 47);
    res.json(result);
  } catch (error) {
    console.error('LucidSales getDepartamentos error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener departamentos' });
  }
};

const getCiudades = async (req, res) => {
  try {
    const { deptoId } = req.query;
    const result = await lucidsalesService.getCiudades(deptoId);
    res.json(result);
  } catch (error) {
    console.error('LucidSales getCiudades error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener ciudades' });
  }
};

const getCiudadesLocales = async (req, res) => {
  try {
    const { deptoId } = req.query;
    const result = lucidsalesService.getCiudadesLocales(deptoId != null ? Number(deptoId) : undefined);
    res.json(result);
  } catch (error) {
    console.error('LucidSales getCiudadesLocales error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener ciudades locales' });
  }
};

const getDepartamentosLocales = async (req, res) => {
  try {
    const result = lucidsalesService.getDepartamentosLocales();
    res.json(result);
  } catch (error) {
    console.error('LucidSales getDepartamentosLocales error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener departamentos locales' });
  }
};

const verificarConexion = async (req, res) => {
  try {
    const result = await lucidsalesService.verificarConexion();
    res.json(result);
  } catch (error) {
    console.error('LucidSales verificarConexion error:', error);
    res.status(500).json({ error: error.message || 'Error al verificar conexión' });
  }
};

const vincularPedido = async (req, res) => {
  try {
    const { lucidsalesPedidoId, notas } = req.body;
    if (!lucidsalesPedidoId) {
      return res.status(400).json({ error: 'lucidsalesPedidoId es requerido' });
    }
    const result = await lucidsalesService.crearVinculacion(lucidsalesPedidoId, notas);
    res.json({ ok: true, pedido: result });
  } catch (error) {
    console.error('LucidSales vincularPedido error:', error);
    res.status(500).json({ error: error.message || 'Error al vincular pedido' });
  }
};

const listarVinculados = async (req, res) => {
  try {
    const { page = 1, itemsPerPage = 50, search = '', estadoFilter } = req.query;
    const result = await lucidsalesService.listVinculaciones({ page: Number(page), itemsPerPage: Number(itemsPerPage), search, estadoFilter });
    res.json(result);
  } catch (error) {
    console.error('LucidSales listarVinculados error:', error);
    res.status(500).json({ error: error.message || 'Error al listar vinculados' });
  }
};

module.exports = {
  getPedidos,
  getPedidoById,
  updatePedido,
  createPedido,
  cotizarEnvio,
  confirmarEnvio,
  validateAddress,
  getFiltersData,
  getPaises,
  getDepartamentos,
  getCiudades,
  getProductos,
  getCiudadesLocales,
  getDepartamentosLocales,
  verificarConexion,
  vincularPedido,
  listarVinculados
};
