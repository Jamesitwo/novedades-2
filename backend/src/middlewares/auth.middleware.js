const jwt = require('jsonwebtoken');
const { validateKey } = require('../controllers/apikey.controller');
const { prisma } = require('../prisma/client');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const sesion = await prisma.sesion.findFirst({
        where: { token, activa: true }
      });
      if (!sesion) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
      }

      req.usuario = decoded;
      req.authType = 'jwt';
      return next();
    }

    if (authHeader.startsWith('ApiKey ')) {
      const clave = authHeader.split(' ')[1];
      const apiKey = await validateKey(clave);
      if (!apiKey) {
        return res.status(401).json({ error: 'API Key inválida o inactiva' });
      }
      const adminUser = await prisma.usuario.findFirst({
        where: { rol: 'admin', activo: true },
        select: { id: true, email: true, rol: true }
      });
      req.usuario = adminUser || { id: 'api-key', email: 'apikey@system', rol: 'admin' };
      req.apiKey = apiKey;
      req.authType = 'apikey';
      return next();
    }

    return res.status(401).json({ error: 'Formato de autenticación no válido' });
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { authMiddleware };