const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma/client');

const parseExpiry = (str) => {
  const match = str.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 8 * 3600000;
  const val = parseInt(match[1]);
  switch (match[2]) {
    case 's': return val * 1000;
    case 'm': return val * 60000;
    case 'h': return val * 3600000;
    case 'd': return val * 86400000;
    default: return 8 * 3600000;
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, password: true, rol: true, activo: true, accesoLucidsales: true }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    const expiraAt = new Date(Date.now() + parseExpiry(expiresIn));

    await prisma.sesion.create({
      data: {
        usuarioId: usuario.id,
        token,
        ip: req.ip || req.socket?.remoteAddress,
        navegador: req.get('User-Agent')?.substring(0, 100),
        expiraAt
      }
    });

    const { password: _, ...usuarioSinPass } = usuario;

    res.json({ token, usuario: usuarioSinPass });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await prisma.sesion.updateMany({
        where: { token, activa: true },
        data: { activa: false }
      });
    }
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const me = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, createdAt: true }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { password: true }
    });

    const validPassword = await bcrypt.compare(currentPassword, usuario.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { login, logout, me, changePassword };