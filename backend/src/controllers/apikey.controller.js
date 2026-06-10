const crypto = require('crypto');
const { prisma } = require('../prisma/client');

const generateKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getAll = async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(keys);
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const clave = generateKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        nombre,
        clave
      }
    });

    res.status(201).json({
      id: apiKey.id,
      nombre: apiKey.nombre,
      clave: apiKey.clave,
      activo: apiKey.activo,
      createdAt: apiKey.createdAt
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const toggleActivo = async (req, res) => {
  try {
    const { id } = req.params;

    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key) {
      return res.status(404).json({ error: 'API key no encontrada' });
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: { activo: !key.activo }
    });

    res.json(updated);
  } catch (error) {
    console.error('Toggle API key error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.apiKey.delete({ where: { id } });

    res.json({ message: 'API key eliminada' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

const validateKey = async (clave) => {
  try {
    const key = await prisma.apiKey.findUnique({
      where: { clave }
    });
    return key && key.activo ? key : null;
  } catch (error) {
    console.error('Validate API key error:', error);
    return null;
  }
};

module.exports = { getAll, create, toggleActivo, remove, validateKey };