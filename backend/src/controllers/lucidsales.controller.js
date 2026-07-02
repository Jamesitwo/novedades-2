const { prisma } = require('../prisma/client');
const lucidsalesService = require('../services/lucidsales.service');
const interrapidisimoService = require('../services/interrapidisimo.service');
const addressValidator = require('../services/address-validator.service');
const googleGeocoding = require('../services/google-geocoding.service');
const hereGeocoding = require('../services/here-geocoding.service');
const path = require('path');
const fs = require('fs');

const ciudadesPath = path.join(__dirname, '..', 'data', 'lucidsales_ciudades.json');
const deptosPath = path.join(__dirname, '..', 'data', 'lucidsales_departamentos.json');

function readJsonWithBOM(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

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
    const { pedidoId, transportadora_id } = req.body;
    if (!pedidoId) return res.status(400).json({ error: 'pedidoId es requerido' });
    const result = await lucidsalesService.confirmarIntegracion(pedidoId, transportadora_id);
    if (result && result.ok === false) {
      return res.status(400).json({ error: result.msg || result.error || 'Error al confirmar envío en LucidSales' });
    }
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

const validarDireccion = async (req, res) => {
  try {
    const { direccion, ciudad, departamento } = req.body;

    let geoResult = null;
    let provider = 'none';

    const googleResult = await googleGeocoding.geocode(direccion || '', { ciudad, departamento });
    if (googleResult.exito) {
      geoResult = googleResult;
      provider = 'google';
    } else {
      const hereResult = await hereGeocoding.geocode(direccion || '', { ciudad, departamento });
      if (hereResult.exito) {
        geoResult = hereResult;
        provider = 'here';
      }
    }

    const result = addressValidator.validateFull(
      direccion || '',
      geoResult,
      { ciudad, departamento }
    );

    result.provider = provider;

    res.json(result);
  } catch (error) {
    console.error('validarDireccion error:', error);
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

const vincularYActualizar = async (req, res) => {
  try {
    const { lucidsalesPedidoId, notas, ...camposActualizar } = req.body;
    if (!lucidsalesPedidoId) {
      return res.status(400).json({ error: 'lucidsalesPedidoId es requerido' });
    }

    console.log(`[LucidSales] vincularYActualizar: id=${lucidsalesPedidoId} campos=`, Object.keys(camposActualizar));

    const pedidoBase = await lucidsalesService.crearVinculacion(lucidsalesPedidoId, notas);

    const pedidoCompleto = await lucidsalesService.getPedidoById(lucidsalesPedidoId);
    const pedidoActualizado = { ...pedidoCompleto, ...camposActualizar };

    if (notas !== undefined) {
      pedidoActualizado.notas = notas;
    }

    const updateResult = await lucidsalesService.updatePedido(pedidoActualizado);
    if (updateResult && updateResult.ok === false) {
      return res.status(400).json({ error: updateResult.msg || updateResult.error || 'Error al actualizar en LucidSales' });
    }

    await lucidsalesService.guardarVinculacionLocal(lucidsalesPedidoId, pedidoActualizado);

    res.json({ ok: true, pedido: pedidoBase, actualizado: true });
  } catch (error) {
    console.error('LucidSales vincularYActualizar error:', error);
    res.status(500).json({ error: error.message || 'Error al vincular y actualizar pedido' });
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

const guardarLocal = async (req, res) => {
  try {
    const { lucidsalesPedidoId, pedido } = req.body;
    if (!lucidsalesPedidoId || !pedido) {
      return res.status(400).json({ error: 'lucidsalesPedidoId y pedido son requeridos' });
    }
    const result = await lucidsalesService.guardarVinculacionLocal(lucidsalesPedidoId, pedido);
    res.json({ ok: true, pedido: result });
  } catch (error) {
    console.error('guardarLocal error:', error);
    res.status(500).json({ error: error.message || 'Error al guardar localmente' });
  }
};

const getEtiquetas = async (req, res) => {
  try {
    const { id } = req.params;
    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: String(id), tabla: 'pedidos_vinculados' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });
    res.json(etiquetas.map(e => e.etiqueta));
  } catch (error) {
    console.error('getEtiquetas error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener etiquetas' });
  }
};

const asignarEtiqueta = async (req, res) => {
  try {
    const { id } = req.params;
    const { etiquetaId } = req.body;
    const registroId = String(id);

    const existente = await prisma.registroEtiqueta.findFirst({
      where: { etiquetaId, registroId, tabla: 'pedidos_vinculados' }
    });
    if (existente) {
      return res.status(400).json({ error: 'La etiqueta ya está asignada' });
    }

    await prisma.registroEtiqueta.create({
      data: { etiquetaId, registroId, tabla: 'pedidos_vinculados' }
    });

    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId, tabla: 'pedidos_vinculados' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    res.json(etiquetas.map(e => e.etiqueta));
  } catch (error) {
    console.error('Asignar etiqueta error:', error);
    res.status(500).json({ error: error.message || 'Error en el servidor' });
  }
};

const removerEtiqueta = async (req, res) => {
  try {
    const { id, etiquetaId } = req.params;

    await prisma.registroEtiqueta.deleteMany({
      where: { etiquetaId, registroId: String(id), tabla: 'pedidos_vinculados' }
    });

    const etiquetas = await prisma.registroEtiqueta.findMany({
      where: { registroId: String(id), tabla: 'pedidos_vinculados' },
      include: { etiqueta: { select: { id: true, nombre: true, color: true } } }
    });

    res.json(etiquetas.map(e => e.etiqueta));
  } catch (error) {
    console.error('Remover etiqueta error:', error);
    res.status(500).json({ error: error.message || 'Error en el servidor' });
  }
};

const buscarOficinaIR = async (req, res) => {
  try {
    const { ciudadId } = req.body;
    if (!ciudadId) return res.status(400).json({ ok: false, error: 'ciudadId requerido' });

    const ciudades = readJsonWithBOM(ciudadesPath);
    const ciudad = ciudades.find(c => c.id === Number(ciudadId));
    if (!ciudad) return res.status(404).json({ ok: false, error: 'Ciudad no encontrada' });

    const deptos = readJsonWithBOM(deptosPath);
    const depto = deptos.find(d => d.id === Number(ciudad.state_id));

    const oficinas = await interrapidisimoService.buscarOficinaPrincipal(ciudad.name, depto?.name);
    res.json({ ok: true, oficinas, ciudad: ciudad.name, departamento: depto?.name });
  } catch (error) {
    console.error('buscarOficinaIR error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Error al buscar oficina' });
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
  validarDireccion,
  getFiltersData,
  getPaises,
  getDepartamentos,
  getCiudades,
  getProductos,
  getCiudadesLocales,
  getDepartamentosLocales,
  verificarConexion,
  vincularPedido,
  vincularYActualizar,
  listarVinculados,
  guardarLocal,
  getEtiquetas,
  asignarEtiqueta,
  removerEtiqueta,
  buscarOficinaIR
};
