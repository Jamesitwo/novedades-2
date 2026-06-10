const { prisma } = require('../prisma/client');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const crearBackup = async (req, res) => {
  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
    const backupDir = path.dirname(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

    await fs.copyFile(dbPath, backupPath);

    const fecha = new Date().toISOString();
    const stats = await fs.stat(backupPath);

    res.json({
      message: 'Backup creado exitosamente',
      archivo: `backup-${timestamp}.db`,
      tamaño: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      fecha
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Error al crear backup' });
  }
};

const listarBackups = async (req, res) => {
  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
    const backupDir = path.dirname(dbPath);

    if (!fsSync.existsSync(backupDir)) {
      return res.json([]);
    }

    const files = await fs.readdir(backupDir);
    const backups = await Promise.all(
      files
        .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
        .map(async f => {
          const stats = await fs.stat(path.join(backupDir, f));
          return {
            archivo: f,
            tamaño: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
            fecha: stats.mtime.toISOString()
          };
        })
    );
    backups.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json(backups);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Error al listar backups' });
  }
};

module.exports = { crearBackup, listarBackups };