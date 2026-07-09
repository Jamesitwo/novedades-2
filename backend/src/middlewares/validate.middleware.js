const { z } = require('zod');

const uuidSchema = z.string().uuid();

const validateBody = (schema) => async (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors.map(e => ({ path: e.path, message: e.message }))
      });
    }
    return res.status(400).json({ error: 'Error de validación' });
  }
};

const validateParams = (schema) => async (req, res, next) => {
  try {
    req.params = schema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Parámetros inválidos',
        details: error.errors.map(e => ({ path: e.path, message: e.message }))
      });
    }
    return res.status(400).json({ error: 'Error de validación' });
  }
};

const validateQuery = (schema) => async (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Query inválida',
        details: error.errors.map(e => ({ path: e.path, message: e.message }))
      });
    }
    return res.status(400).json({ error: 'Error de validación' });
  }
};

const idParamSchema = z.object({ id: uuidSchema });

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
});

const novedadSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  celular: z.string().min(1).max(20),
  celular2: z.string().max(20).optional().nullable(),
  producto: z.string().min(1),
  totalAPagar: z.union([z.string(), z.number()]).transform(v => parseFloat(v) || 0),
  transportadora: z.string().min(1).max(100),
  guia: z.string().min(1).max(100),
  motivoNovedad: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  conversacionLink: z.string().url().optional().nullable().or(z.literal('')),
  chatActivo: z.boolean().optional(),
  fechaUltimoMsjCliente: z.string().datetime().optional().nullable()
});
const oficinaSchema = z.object({
  nombre: z.string().min(1).max(100),
  apellido: z.string().min(1).max(100),
  celular: z.string().min(1).max(20),
  celular2: z.string().max(20).optional().nullable(),
  producto: z.string().min(1),
  precio: z.union([z.string(), z.number()]).transform(v => parseFloat(v) || 0).optional(),
  transportadora: z.string().min(1).max(100),
  guia: z.string().min(1).max(100),
  fechaLlegada: z.string().optional().nullable(),
  imagenGuiaUrl: z.string().url().optional().nullable().or(z.literal('')),
  notas: z.string().optional().nullable(),
  notasInternas: z.string().optional().nullable(),
  conversacionLink: z.string().url().optional().nullable().or(z.literal('')),
  chatActivo: z.boolean().optional(),
  fechaUltimoMsjCliente: z.string().datetime().optional().nullable()
});
const cambiarEstadoNovedadSchema = z.object({
  estado: z.enum(['novedad', 'contactado', 'solucionado', 'cancelado', 'entregado', 'devolucion'])
});

const cambiarEstadoOficinaSchema = z.object({
  estado: z.enum(['pendiente_llamar', 'contactado', 'va_a_recoger', 'no_va_a_recoger', 'entregado', 'devolucion'])
});

const intentoSchema = z.object({
  resultado: z.enum(['no_contesta', 'ocupado', 'equivocado', 'contactado', 'buzon']),
  notas: z.string().optional().nullable()
});

const bulkEstadoSchema = z.object({
  ids: z.array(uuidSchema).min(1),
  estado: z.string().min(1)
});

const bulkAsignarSchema = z.object({
  ids: z.array(uuidSchema).min(1),
  asignadoId: uuidSchema
});

const bulkDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1)
});

const transferirSchema = z.object({
  aUsuarioId: uuidSchema,
  notas: z.string().optional().nullable()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

const chatSchema = z.object({
  chatActivo: z.boolean()
});

const usuarioSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  rol: z.enum(['admin', 'operador', 'operador_asignado']),
  activo: z.boolean().optional(),
  verSoloAsignados: z.boolean().optional(),
  puedeGestionarNovedades: z.boolean().optional(),
  puedeGestionarOficina: z.boolean().optional(),
  puedeGestionarPedidos: z.boolean().optional()
});

const usuarioUpdateSchema = z.object({
  email: z.string().email('Email invalido').optional(),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').optional(),
  nombre: z.string().min(1, 'El nombre es requerido').max(100).optional(),
  rol: z.enum(['admin', 'operador', 'operador_asignado']).optional(),
  activo: z.boolean().optional(),
  verSoloAsignados: z.boolean().optional(),
  puedeGestionarNovedades: z.boolean().optional(),
  puedeGestionarOficina: z.boolean().optional(),
  puedeGestionarPedidos: z.boolean().optional()
});

const tareaSchema = z.object({
  titulo: z.string().min(1, 'El titulo es requerido').max(200),
  descripcion: z.string().optional().nullable(),
  estado: z.enum(['pendiente', 'en_progreso', 'revision', 'completada', 'cancelada']).optional(),
  asignadoId: z.string().uuid().optional().nullable(),
  prioridad: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  fechaVencimiento: z.string().datetime().optional().nullable().or(z.literal(''))
});

const facturaSchema = z.object({
  numero: z.string().min(1, 'El numero de factura es requerido').max(50),
  clienteNombre: z.string().min(1, 'El nombre del cliente es requerido').max(100),
  clienteDocumento: z.string().max(30).optional().nullable(),
  clienteDireccion: z.string().max(200).optional().nullable(),
  clienteTelefono: z.string().max(20).optional().nullable(),
  items: z.string().min(1, 'Los items son requeridos'),
  subtotal: z.union([z.string(), z.number()]).transform(v => parseFloat(v) || 0),
  iva: z.union([z.string(), z.number()]).transform(v => parseFloat(v) || 0).optional(),
  total: z.union([z.string(), z.number()]).transform(v => parseFloat(v) || 0),
  estado: z.enum(['pendiente', 'pagada', 'anulada']).optional(),
  notas: z.string().optional().nullable()
});

const garantiaSchema = z.object({
  producto: z.string().min(1, 'El producto es requerido').max(200),
  descripcion: z.string().min(1, 'La descripcion es requerida'),
  emailCliente: z.string().email('Email invalido').optional().nullable().or(z.literal('')),
  telefonoCliente: z.string().max(20).optional().nullable().or(z.literal('')),
  fotos: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable()
});

const garantiaRegistroSchema = z.object({
  producto: z.string().min(1).max(200),
  descripcion: z.string().min(1),
  emailCliente: z.string().email().optional().nullable().or(z.literal('')),
  telefonoCliente: z.string().max(20).optional().nullable().or(z.literal(''))
});

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  idParamSchema,
  loginSchema,
  novedadSchema,
  oficinaSchema,
  cambiarEstadoNovedadSchema,
  cambiarEstadoOficinaSchema,
  intentoSchema,
  bulkEstadoSchema,
  bulkAsignarSchema,
  bulkDeleteSchema,
  transferirSchema,
  changePasswordSchema,
  chatSchema,
  usuarioSchema,
  usuarioUpdateSchema,
  tareaSchema,
  facturaSchema,
  garantiaSchema,
  garantiaRegistroSchema
};
