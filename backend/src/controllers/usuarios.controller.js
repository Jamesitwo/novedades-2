const bcrypt = require('bcryptjs');
const { prisma } = require('../prisma/client');
const { paginate } = require('../utils/paginate');
const wsService = require('../services/websocket.service');

const getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          verSoloAsignados: true,
          accesoLucidsales: true,
          gestionaNovedades: true,
          gestionaOficina: true,
          gestionaPedidos: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.usuario.count()
    ]);

    res.json(paginate(usuarios, total, parseInt(page), parseInt(limit)));
  } catch (error) {
    console.error('Get usuarios error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const rolesPermitidos = ['admin', 'operador'];
    if (rol && !rolesPermitidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: rol || 'operador'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true
      }
    });

    res.status(201).json(usuario);
  } catch (error) {
    console.error('Create usuario error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo, password, verSoloAsignados, accesoLucidsales, gestionaNovedades, gestionaOficina, gestionaPedidos } = req.body;

    if (rol && !['admin', 'operador', 'operador_asignado'].includes(rol)) {
      return res.status(400).json({ error: 'Rol no válido' });
    }

    const data = { nombre, email, rol, activo };
    if (password) data.password = await bcrypt.hash(password, 10);
    if (verSoloAsignados !== undefined) data.verSoloAsignados = verSoloAsignados;
    if (accesoLucidsales !== undefined) data.accesoLucidsales = accesoLucidsales;
    if (gestionaNovedades !== undefined) data.gestionaNovedades = gestionaNovedades;
    if (gestionaOficina !== undefined) data.gestionaOficina = gestionaOficina;
    if (gestionaPedidos !== undefined) data.gestionaPedidos = gestionaPedidos;

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        accesoLucidsales: true,
        gestionaNovedades: true,
        gestionaOficina: true,
        gestionaPedidos: true,
        verSoloAsignados: true,
        createdAt: true
      }
    });

    wsService.usuarioActualizado(id, req.usuario);

    res.json(usuario);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    console.error('Update usuario error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.usuario.update({
      where: { id },
      data: { activo: false }
    });

    res.json({ message: 'Usuario desactivado' });
  } catch (error) {
    console.error('Remove usuario error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const getOperadores = async (req, res) => {
  try {
    const operadores = await prisma.usuario.findMany({
      where: { activo: true, rol: { in: ['admin', 'operador'] } },
      select: {
        id: true,
        nombre: true,
        rol: true
      },
      orderBy: { nombre: 'asc' }
    });

    res.json(operadores);
  } catch (error) {
    console.error('Get operadores error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = { getAll, create, update, remove, getOperadores };