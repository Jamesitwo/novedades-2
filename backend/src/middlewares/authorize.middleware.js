const { prisma } = require('../prisma/client');
const { sendError } = require('../utils/response');

const MODEL_MAP = {
  novedades: { prismaModel: 'pedidoNovedad', tabla: 'pedidos_novedad' },
  oficina: { prismaModel: 'pedidoOficina', tabla: 'pedidos_oficina' },
  vinculados: { prismaModel: 'pedidoVinculado', tabla: 'pedidos_vinculados' },
  tareas: { prismaModel: 'tarea', tabla: 'tareas' },
};

function authorizeRecord(module) {
  const config = MODEL_MAP[module];
  if (!config) {
    throw new Error(`Module ${module} not supported for record authorization`);
  }

  return async (req, res, next) => {
    if (req.usuario.rol === 'admin') {
      return next();
    }

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: req.usuario.id },
        select: { puedeModificarTodo: true }
      });
      if (usuario?.puedeModificarTodo) {
        return next();
      }
    } catch {}

    const recordId = req.params.id;
    if (!recordId) {
      return sendError(res, 400, 'MISSING_ID', 'ID de registro requerido');
    }

    try {
      const record = await prisma[config.prismaModel].findUnique({
        where: { id: recordId },
        select: { asignadoId: true }
      });

      if (!record) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      if (!record.asignadoId || record.asignadoId !== req.usuario.id) {
        return sendError(res, 403, 'FORBIDDEN', 'No tienes acceso a este registro');
      }

      next();
    } catch (error) {
      console.error('[authorizeRecord] Error:', error.message);
      return res.status(500).json({ error: 'Error verificando permisos' });
    }
  };
}

module.exports = { authorizeRecord };
