const jwt = require('jsonwebtoken');
const { validateKey } = require('../controllers/apikey.controller');
const { prisma } = require('../prisma/client');
const { sendError } = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 401, 'AUTH_REQUIRED', 'Token no proporcionado');
    }

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const sesion = await prisma.sesion.findFirst({
        where: { token, activa: true }
      });
      if (!sesion) {
        return sendError(res, 401, 'SESSION_EXPIRED', 'Sesion invalida o expirada');
      }

      req.usuario = decoded;
      req.authType = 'jwt';
      return next();
    }

    if (authHeader.startsWith('ApiKey ')) {
      const clave = authHeader.split(' ')[1];
      const apiKey = await validateKey(clave);
      if (!apiKey) {
        return sendError(res, 401, 'APIKEY_INVALID', 'API Key invalida o inactiva');
      }
      const adminUser = await prisma.usuario.findFirst({
        where: { rol: 'admin', activo: true },
        select: { id: true, email: true, rol: true }
      });
      if (!adminUser) {
        return sendError(res, 500, 'NO_ADMIN', 'No hay administrador activo en el sistema. Contacte al soporte.');
      }
      req.usuario = adminUser;
      req.apiKey = apiKey;
      req.authType = 'apikey';
      return next();
    }

    return sendError(res, 401, 'AUTH_INVALID_FORMAT', 'Formato de autenticacion no valido');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'TOKEN_EXPIRED', 'El token ha expirado. Inicie sesion nuevamente.');
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return sendError(res, 401, 'TOKEN_INVALID', 'Token invalido. Inicie sesion nuevamente.');
    }
    return sendError(res, 401, 'AUTH_FAILED', 'Error de autenticacion');
  }
};

module.exports = { authMiddleware };