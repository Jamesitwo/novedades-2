const adminOnly = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
};

const operadorOMas = (req, res, next) => {
  if (!['admin', 'operador'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  next();
};

const adminOOperadorAsignado = (req, res, next) => {
  if (!['admin', 'operador', 'operador_asignado'].includes(req.usuario.rol)) {
    return res.status(403).json({ error: 'Acceso no autorizado' });
  }
  next();
};

module.exports = { adminOnly, operadorOMas, adminOOperadorAsignado };