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
  conversacionLink: z.string().url().optional().nullable().or(z.literal(''))
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
  conversacionLink: z.string().url().optional().nullable().or(z.literal(''))
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
  chatSchema
};
