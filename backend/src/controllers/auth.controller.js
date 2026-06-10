const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma/client');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, password: true, rol: true, activo: true }
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

    const expiraEnHoras = parseInt(expiresIn) || 8;
    const expiraAt = new Date(Date.now() + expiraEnHoras * 3600000);

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

module.exports = { login, logout, me };