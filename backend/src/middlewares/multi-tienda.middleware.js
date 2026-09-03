function verMultiTienda(usuario) {
  const emails = (process.env.MULTI_TIENDA_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return emails.includes((usuario?.email || '').toLowerCase());
}

const multiTiendaOnly = (req, res, next) => {
  if (verMultiTienda(req.usuario)) {
    return next();
  }
  return res.status(403).json({ error: 'Acceso no autorizado' });
};

module.exports = { multiTiendaOnly, verMultiTienda };
