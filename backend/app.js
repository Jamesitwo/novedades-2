require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/auth.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const novedadesRoutes = require('./src/routes/novedades.routes');
const oficinaRoutes = require('./src/routes/oficina.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const historialRoutes = require('./src/routes/historial.routes');
const configuracionRoutes = require('./src/routes/configuracion.routes');
const apikeyRoutes = require('./src/routes/apikey.routes');
const sesionesRoutes = require('./src/routes/sesiones.routes');
const vistasRoutes = require('./src/routes/vistas.routes');
const backupRoutes = require('./src/routes/backup.routes');
const pizdoRoutes = require('./src/routes/pizdo.routes');
const etiquetasRoutes = require('./src/routes/etiquetas.routes');
const facturasRoutes = require('./src/routes/facturas.routes');
const garantiasRoutes = require('./src/routes/garantias.routes');

const isProduction = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (FRONTEND_URL && origin === FRONTEND_URL) return callback(null, true);
    if (['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000'].includes(origin)) return callback(null, true);
    if (isProduction && !FRONTEND_URL) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

if (isProduction) {
  morgan.token('body', (req) => req.method === 'POST' || req.method === 'PUT' ? '' : '');
  app.use(morgan(':method :url :status :response-time ms - :remote-addr', {
    stream: process.stdout
  }));
} else {
  app.use(morgan('dev'));
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 100,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 200 : 1000,
  message: { error: 'Demasiadas solicitudes. Intenta en un minuto.' }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/novedades', novedadesRoutes);
app.use('/api/oficina', oficinaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/apikey', apikeyRoutes);
app.use('/api/sesiones', sesionesRoutes);
app.use('/api/vistas', vistasRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/pizdo', pizdoRoutes);
app.use('/api/etiquetas', etiquetasRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/garantias', garantiasRoutes);

const cloudinaryRoutes = require('./src/routes/cloudinary.routes');
app.use('/api/cloudinary', cloudinaryRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  const message = isProduction && statusCode === 500
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';
  res.status(statusCode).json({ error: message });
});

module.exports = app;
