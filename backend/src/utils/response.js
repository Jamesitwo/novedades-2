const isProduction = process.env.NODE_ENV === 'production';

function sendSuccess(res, data = null, statusCode = 200) {
  const body = { success: true };
  if (data !== null && data !== undefined) {
    body.data = data;
  }
  return res.status(statusCode).json(body);
}

function sendError(res, statusCode, code, message, details = null) {
  const body = {
    success: false,
    error: { code, message }
  };
  if (details && !isProduction) {
    body.error.details = details;
  }
  return res.status(statusCode).json(body);
}

function handlePrismaError(error) {
  if (error.code === 'P2002') {
    const target = error.meta?.target || 'campo';
    return { status: 409, code: 'DUPLICATE', message: `El ${target} ya existe` };
  }
  if (error.code === 'P2025') {
    return { status: 404, code: 'NOT_FOUND', message: 'El registro no existe' };
  }
  if (error.code === 'P2003') {
    return { status: 400, code: 'FOREIGN_KEY', message: 'Referencia a un registro inexistente' };
  }
  if (error.code?.startsWith('P20')) {
    return { status: 400, code: 'VALIDATION_ERROR', message: error.message };
  }
  return { status: 500, code: 'INTERNAL', message: 'Error interno del servidor' };
}

function sendPrismaError(res, error) {
  const { status, code, message } = handlePrismaError(error);
  return sendError(res, status, code, message, isProduction ? null : error.message);
}

module.exports = { sendSuccess, sendError, handlePrismaError, sendPrismaError };
