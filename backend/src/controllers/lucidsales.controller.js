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
    const { getNextOperador } = require('../utils/autoAssign');
    const asignadoId = await getNextOperador('lucidsales');
    const result = await lucidsalesService.crearVinculacion(lucidsalesPedidoId, notas, req.usuario.id, asignadoId);
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

    const camposPermitidos = ['Nombre','Apellido','Movil','Direccion','Referencias','Total','SubTotal','CostoEnvio','Correo','NIT','Ciudad','Departamento','Pais','EstadoPedido','codigoPostal','logistic'];
    const camposFiltrados = {};
    for (const [k, v] of Object.entries(camposActualizar)) {
      if (camposPermitidos.includes(k) && v !== undefined) {
        camposFiltrados[k] = v;
      }
    }

    console.log(`[LucidSales] vincularYActualizar: id=${lucidsalesPedidoId} campos=`, Object.keys(camposFiltrados));

    const pedidoBase = await lucidsalesService.crearVinculacion(lucidsalesPedidoId);

    const pedidoCompleto = await lucidsalesService.getPedidoById(lucidsalesPedidoId);
    const pedidoActualizado = { ...pedidoCompleto, ...camposFiltrados };

    if (notas) {
      let observaciones = [];
      try {
        observaciones = typeof pedidoCompleto.Observaciones === 'string'
          ? JSON.parse(pedidoCompleto.Observaciones)
          : (pedidoCompleto.Observaciones || []);
      } catch { observaciones = []; }
      observaciones.push({
        desc: notas,
        update: new Date().toISOString()
      });
      pedidoActualizado.Observaciones = JSON.stringify(observaciones);
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

const duplicarPedido = async (req, res) => {
  try {
    const { id } = req.params;

    const original = await lucidsalesService.getPedidoById(id);
    if (!original || !original.id) {
      return res.status(404).json({ error: 'Pedido original no encontrado en LucidSales' });
    }

    const refUnica = `DUP-${original.idPedido || id}-${Date.now()}`;

    const nuevoPedido = {
      nombreCliente: original.Nombre || '',
      apellidoCliente: original.Apellido || '',
      emailCliente: original.Correo || '',
      telefonoCliente: original.Movil || '',
      direccionCliente: original.Direccion || '',
      ciudadCliente: Number(original.Ciudad ?? 0),
      departamentoCliente: Number(original.Departamento ?? 0),
      paisCliente: Number(original.Pais || 47),
      codigoPostal: original.codigoPostal || null,
      nitCliente: original.NIT || '',
      json: original.Json || '[]',
      subTotal: Number(original.SubTotal || 0),
      costoEnvio: Number(original.CostoEnvio || 0),
      total: Number(original.Total || 0),
      Referencias: refUnica
    };

    const result = await lucidsalesService.createPedido(nuevoPedido);
    if (result && result.ok === false) {
      return res.status(400).json({ error: result.msg || result.error || 'Error al crear pedido duplicado en LucidSales' });
    }

    console.log('[LucidSales] duplicarPedido create result:', JSON.stringify(result).slice(0, 300));

    let nuevoId = result?.pedido?.id || result?.id || result?.pedidoId || result?.data?.id;
    if (!nuevoId && result?.pedido && typeof result.pedido === 'string') {
      nuevoId = parseInt(result.pedido, 10) || null;
    }

    if (!nuevoId) {
      const pedidos = await lucidsalesService.getPedidos({ search: refUnica, itemsPerPage: 3 });
      const match = pedidos?.pedidos?.[0];
      if (match?.id) nuevoId = match.id;
    }

    if (!nuevoId) {
      return res.status(500).json({ error: 'Pedido creado en LucidSales pero no se pudo obtener su ID. Revisa los logs del servidor.' });
    }

    console.log('[LucidSales] duplicarPedido: vinculando nuevoId=', nuevoId);

    try {
      const { getNextOperador } = require('../utils/autoAssign');
    const asignadoId = await getNextOperador('lucidsales');
    await lucidsalesService.crearVinculacionDirecta(nuevoId, original, `Duplicado del pedido #${original.idPedido || id}`, req.usuario.id, asignadoId);
      console.log('[LucidSales] duplicarPedido: vinculacion exitosa');
    } catch (vinError) {
      console.error('[LucidSales] duplicarPedido: error al vincular:', vinError.message);
      return res.status(500).json({ error: `Pedido creado (#${nuevoId}) pero fallo la vinculacion: ${vinError.message}` });
    }

    const verificar = await prisma.pedidoVinculado.findUnique({ where: { lucidsalesPedidoId: Number(nuevoId) } });
    console.log('[LucidSales] duplicarPedido: verificado en DB:', verificar ? 'SI' : 'NO');

    res.json({ ok: true, nuevoId });
  } catch (error) {
    console.error('LucidSales duplicarPedido error:', error);
    res.status(500).json({ error: error.message || 'Error al duplicar pedido' });
  }
};

const subirDividido = async (req, res) => {
  try {
    const { id } = req.params;
    const { transportadora_id } = req.body;

    const original = await lucidsalesService.getPedidoById(id);
    if (!original || !original.id) {
      return res.status(404).json({ error: 'Pedido original no encontrado en LucidSales' });
    }

    let productos = [];
    try {
      productos = typeof original.Json === 'string' ? JSON.parse(original.Json) : (original.Json || []);
    } catch { productos = []; }

    if (productos.length < 2) {
      return res.status(400).json({ error: 'El pedido debe tener al menos 2 productos para dividir' });
    }

    const { getNextOperador } = require('../utils/autoAssign');
    const asignadoId = await getNextOperador('lucidsales');

    const resultados = [];
    for (let i = 0; i < productos.length; i++) {
      const prod = productos[i];
      const refUnica = `DUP-${original.idPedido || id}-P${i + 1}-${Date.now()}`;
      const jsonSingle = JSON.stringify([{ ...prod }]);

      try {
        const nuevoPedido = {
          nombreCliente: original.Nombre || '',
          apellidoCliente: original.Apellido || '',
          emailCliente: original.Correo || '',
          telefonoCliente: original.Movil || '',
          direccionCliente: original.Direccion || '',
          ciudadCliente: Number(original.Ciudad ?? 0),
          departamentoCliente: Number(original.Departamento ?? 0),
          paisCliente: Number(original.Pais || 47),
          codigoPostal: original.codigoPostal || null,
          nitCliente: original.NIT || '',
          json: jsonSingle,
          subTotal: Number(prod.price || 0) * Number(prod.quantity || 1),
          costoEnvio: 0,
          total: Number(prod.price || 0) * Number(prod.quantity || 1),
          Referencias: refUnica
        };

        const createResult = await lucidsalesService.createPedido(nuevoPedido);
        if (createResult && createResult.ok === false) {
          resultados.push({ producto: prod.product_id, error: createResult.msg || createResult.error || 'Error al crear' });
          continue;
        }

        let nuevoId = createResult?.pedido?.id || createResult?.id || createResult?.pedidoId || createResult?.data?.id;
        if (!nuevoId) {
          const pedidos = await lucidsalesService.getPedidos({ search: refUnica, itemsPerPage: 3 });
          const match = pedidos?.pedidos?.[0];
          if (match?.id) nuevoId = match.id;
        }

        if (!nuevoId) {
          resultados.push({ producto: prod.product_id, error: 'No se pudo obtener ID del pedido creado' });
          continue;
        }

        const uploadResult = await lucidsalesService.confirmarIntegracion(nuevoId, 'dropi', { transportadora_id });
        if (uploadResult && uploadResult.ok === false) {
          resultados.push({ producto: prod.product_id, pedidoId: nuevoId, error: uploadResult.msg || uploadResult.error || 'Error al subir' });
          continue;
        }

        await lucidsalesService.crearVinculacionDirecta(nuevoId, original,
          `Producto ${i + 1}/${productos.length} del pedido #${original.idPedido || id}`, req.usuario.id, asignadoId);

        resultados.push({ producto: prod.product_id, pedidoId: nuevoId, exito: true });
      } catch (err) {
        resultados.push({ producto: prod.product_id, error: err.message });
      }
    }

    const exitos = resultados.filter(r => r.exito).length;
    const fallos = resultados.filter(r => r.error).length;

    res.json({ ok: true, total: productos.length, exitos, fallos, resultados });
  } catch (error) {
    console.error('LucidSales subirDividido error:', error);
    res.status(500).json({ error: error.message || 'Error al dividir y subir pedido' });
  }
};

const listarVinculados = async (req, res) => {
  try {
    const { page = 1, itemsPerPage = 50, search = '', estadoFilter } = req.query;
    const opts = { page: Number(page), itemsPerPage: Number(itemsPerPage), search, estadoFilter };
    if (estadoFilter === 'asignados') {
      opts.asignadoId = req.usuario.id;
      opts.estadoFilter = undefined;
    }
    const result = await lucidsalesService.listVinculaciones(opts);
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
  duplicarPedido,
  subirDividido,
  listarVinculados,
  guardarLocal,
  getEtiquetas,
  asignarEtiqueta,
  removerEtiqueta,
  buscarOficinaIR
};
