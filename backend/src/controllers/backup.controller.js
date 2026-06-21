const { prisma } = require('../prisma/client');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const isPostgres = () => {
  return (process.env.DATABASE_URL || '').startsWith('postgres');
};

const crearBackup = async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fsSync.existsSync(backupDir)) {
      await fs.mkdir(backupDir, { recursive: true });
    }

    if (isPostgres()) {
      const dbUrl = new URL(process.env.DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const dbName = dbUrl.pathname.replace('/', '');
      const user = dbUrl.username;
      const password = dbUrl.password;

      const backupPath = path.join(backupDir, `backup-${timestamp}.sql`);
      const env = { ...process.env, PGPASSWORD: password };
      execSync(
        `pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} -f "${backupPath}" --no-owner --no-acl`,
        { env, timeout: 60000 }
      );

      const stats = await fs.stat(backupPath);
      res.json({
        message: 'Backup creado exitosamente (PostgreSQL)',
        archivo: `backup-${timestamp}.sql`,
        tamaño: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        fecha: new Date().toISOString()
      });
    } else {
      const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
      const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

      await fs.copyFile(dbPath, backupPath);

      const stats = await fs.stat(backupPath);
      res.json({
        message: 'Backup creado exitosamente (SQLite)',
        archivo: `backup-${timestamp}.db`,
        tamaño: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        fecha: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Error al crear backup' });
  }
};

const listarBackups = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'backups');

    if (!fsSync.existsSync(backupDir)) {
      return res.json([]);
    }

    const files = await fs.readdir(backupDir);
    const backups = await Promise.all(
      files
        .filter(f => f.startsWith('backup-') && (f.endsWith('.db') || f.endsWith('.sql')))
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
