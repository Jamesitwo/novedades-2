const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma/client');

const ROOMS = Object.freeze({
  NOVEDADES: 'novedades',
  OFICINA: 'oficina',
  TAREAS: 'tareas',
  ADMIN: 'admin',
});

let io = null;
const connectedUsers = new Map();

function init(server) {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    connectTimeout: 10000
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Token de autenticacion requerido'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const sesion = await prisma.sesion.findFirst({ where: { token, activa: true } });
      if (!sesion) return next(new Error('Sesion invalida o expirada'));
      socket.userId = decoded.id;
      socket.userRol = decoded.rol;
      socket.userNombre = decoded.nombre;
      next();
    } catch (error) {
      next(new Error('Token invalido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const rol = socket.userRol;

    console.log(`[WS] Usuario conectado: ${socket.userNombre} (${userId})`);

    socket.join(`user:${userId}`);
    connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1);

    if (rol === 'admin') socket.join(ROOMS.ADMIN);
    socket.join(ROOMS.NOVEDADES);
    socket.join(ROOMS.OFICINA);
    socket.join(ROOMS.TAREAS);

    socket.emit('system:connected', {
      userId, rol, mensaje: 'Conectado en tiempo real', usuariosConectados: connectedUsers.size
    });

    socket.to(ROOMS.ADMIN).emit('system:user-online', {
      userId, nombre: socket.userNombre, totalConectados: connectedUsers.size
    });

    socket.on('disconnect', () => {
      const count = connectedUsers.get(userId) - 1;
      if (count <= 0) {
        connectedUsers.delete(userId);
        console.log(`[WS] Usuario desconectado: ${socket.userNombre} (${userId})`);
        socket.to(ROOMS.ADMIN).emit('system:user-offline', {
          userId, nombre: socket.userNombre, totalConectados: connectedUsers.size
        });
      } else {
        connectedUsers.set(userId, count);
      }
    });

    socket.on('join:record', (recordId) => { if (recordId) socket.join(`record:${recordId}`); });
    socket.on('leave:record', (recordId) => { if (recordId) socket.leave(`record:${recordId}`); });
  });

  console.log('[WS] WebSocket inicializado');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO no ha sido inicializado. Llama a init(server) primero.');
  return io;
}

function getConnectedCount() { return connectedUsers.size; }
function isUserOnline(userId) { return connectedUsers.has(userId); }

function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, data);
}

function emitToAdmins(event, data) {
  if (!io) return;
  io.to(ROOMS.ADMIN).emit(event, data);
}

function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
}

function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

// --- Fabrica generica de eventos por entidad ---

/**
 * @param {string} noun - Nombre singular de la entidad (ej: 'novedad', 'oficina')
 * @param {string} plural - Nombre plural / room (ej: 'novedades', 'oficina')
 * @returns {object} Set de funciones de emision
 */
function createEntityEvents(noun, plural) {
  const entityRoom = plural || noun + 's';

  function created(record, usuario) {
    if (!io) return;
    emitToAll(`${noun}:created`, { [noun]: record, usuario: usuario.nombre });
    emitToRoom(entityRoom, 'dashboard:refresh', { motivo: `${noun}_creada` });
    if (record.asignadoId) {
      emitToUser(record.asignadoId, 'notificacion', {
        tipo: 'nueva_asignacion',
        mensaje: `${usuario.nombre} te asigno un registro`,
        registroId: record.id,
        tabla: plural
      });
    }
  }

  function updated(id, cambios, usuario) {
    if (!io) return;
    const payload = { id, cambios, usuario: usuario.nombre };
    emitToRoom(entityRoom, `${noun}:updated`, payload);
    emitToRoom(`record:${id}`, `${noun}:updated`, payload);
  }

  function estadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
    if (!io) return;
    const payload = { id, estadoAnterior, estadoNuevo, usuario: usuario.nombre };
    emitToRoom(entityRoom, `${noun}:estado-changed`, payload);
    emitToRoom(`record:${id}`, `${noun}:estado-changed`, payload);
    emitToRoom(entityRoom, 'dashboard:refresh', { motivo: 'estado_cambiado' });
  }

  function deleted(id, usuario) {
    if (!io) return;
    emitToRoom(entityRoom, `${noun}:deleted`, { id, usuario: usuario.nombre });
    emitToRoom(`record:${id}`, `${noun}:deleted`, { id });
  }

  function bulkAction(accion, ids, usuario) {
    if (!io) return;
    emitToRoom(entityRoom, `${noun}:bulk-action`, { accion, ids, usuario: usuario.nombre });
    emitToRoom(entityRoom, 'dashboard:refresh', { motivo: 'bulk_action' });
  }

  function etiquetaChanged(id, usuario) {
    if (!io) return;
    emitToRoom(entityRoom, `${noun}:etiqueta-changed`, { id, usuario: usuario.nombre });
    emitToRoom(`record:${id}`, `${noun}:etiqueta-changed`, { id });
  }

  function transferida(id, deUsuario, aUsuarioId, aUsuarioNombre, registro) {
    if (!io) return;
    emitToRoom(entityRoom, `${noun}:transferred`, {
      id, deUsuario: deUsuario.nombre, aUsuarioId, aUsuarioNombre
    });
    emitToUser(aUsuarioId, 'notificacion', {
      tipo: 'transferencia',
      mensaje: `${deUsuario.nombre} te transfirio un registro`,
      registroId: id,
      tabla: plural
    });
    emitToRoom(entityRoom, 'dashboard:refresh', { motivo: 'transferencia' });
  }

  return { created, updated, estadoCambiado, deleted, bulkAction, etiquetaChanged, transferida };
}

const novedadesEvents = createEntityEvents('novedad', ROOMS.NOVEDADES);
const oficinaEvents = createEntityEvents('oficina', ROOMS.OFICINA);
const tareasEvents = createEntityEvents('tarea', ROOMS.TAREAS);

// --- WhatsApp ---

function whatsappMensajeRecibido(tabla, registroId, mensaje) {
  if (!io) return;
  const payload = { tabla, registroId, mensaje };
  emitToRoom(ROOMS.NOVEDADES, 'whatsapp:message-received', payload);
  emitToRoom(ROOMS.OFICINA, 'whatsapp:message-received', payload);
  emitToRoom(`record:${registroId}`, 'whatsapp:message-received', payload);
}

function whatsappMensajeEnviado(tabla, registroId, mensaje, usuarioId) {
  if (!io) return;
  emitToRoom(`record:${registroId}`, 'whatsapp:message-sent', { tabla, registroId, mensaje });
  if (usuarioId) emitToUser(usuarioId, 'whatsapp:message-sent', { tabla, registroId, mensaje });
}

function whatsappVentanaExpirada(tabla, registroId) {
  if (!io) return;
  const payload = { tabla, registroId };
  emitToRoom(`record:${registroId}`, 'whatsapp:window-expired', payload);
  emitToRoom(ROOMS.NOVEDADES, 'whatsapp:window-expired', payload);
  emitToRoom(ROOMS.OFICINA, 'whatsapp:window-expired', payload);
}

// --- Dashboard ---

function dashboardRefresh(motivo) {
  if (!io) return;
  const payload = { motivo, timestamp: new Date().toISOString() };
  emitToRoom(ROOMS.NOVEDADES, 'dashboard:refresh', payload);
  emitToRoom(ROOMS.OFICINA, 'dashboard:refresh', payload);
}

// --- Usuarios / Sesiones ---

function usuarioActualizado(id, usuario) {
  emitToAdmins('usuario:updated', { id, usuario: usuario.nombre });
}

function sesionForzadaLogout(usuarioId) {
  emitToUser(usuarioId, 'sesion:forced-logout', {
    mensaje: 'Tu sesion ha sido cerrada por un administrador',
    timestamp: new Date().toISOString()
  });
}

// --- Facturas ---

function facturaCreada(factura, usuario) {
  emitToAll('factura:created', { factura, usuario: usuario.nombre });
}

function facturaEstadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
  emitToAll('factura:estado-changed', { id, estadoAnterior, estadoNuevo, usuario: usuario.nombre });
}

// --- Garantias ---

function garantiaCreada(garantia) {
  emitToAdmins('garantia:created', { garantia });
}

function garantiaEstadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
  emitToAdmins('garantia:estado-changed', { id, estadoAnterior, estadoNuevo, usuario: usuario?.nombre });
}

// --- Sistema ---

function notificarError(usuarioId, mensaje) {
  if (usuarioId) emitToUser(usuarioId, 'system:error', { mensaje });
}

function notificarInfo(mensaje) {
  emitToAll('system:info', { mensaje, timestamp: new Date().toISOString() });
}

function tiendaCompraSimulada(productoNombre) {
  if (!io) return;
  const hace = Math.floor(Math.random() * 30) + 1;
  io.emit('tienda:compra-simulada', {
    mensaje: productoNombre ? `Alguien acaba de comprar "${productoNombre}"` : 'Alguien acaba de hacer una compra!',
    hace: `${hace} min`
  });
}

module.exports = {
  init, getIO, getConnectedCount, isUserOnline,
  emitToUser, emitToAdmins, emitToRoom, emitToAll,

  novedadCreada: novedadesEvents.created,
  novedadActualizada: novedadesEvents.updated,
  novedadEstadoCambiado: novedadesEvents.estadoCambiado,
  novedadEliminada: novedadesEvents.deleted,
  novedadTransferida: novedadesEvents.transferida,
  novedadBulkAction: novedadesEvents.bulkAction,
  novedadEtiquetaChanged: novedadesEvents.etiquetaChanged,

  oficinaCreada: oficinaEvents.created,
  oficinaActualizada: oficinaEvents.updated,
  oficinaEstadoCambiado: oficinaEvents.estadoCambiado,
  oficinaEliminada: oficinaEvents.deleted,
  oficinaTransferida: oficinaEvents.transferida,
  oficinaBulkAction: oficinaEvents.bulkAction,
  oficinaEtiquetaChanged: oficinaEvents.etiquetaChanged,

  tareaCreada: tareasEvents.created,
  tareaActualizada: tareasEvents.updated,
  tareaEstadoCambiado: tareasEvents.estadoCambiado,
  tareaEliminada: tareasEvents.deleted,

  whatsappMensajeRecibido, whatsappMensajeEnviado, whatsappVentanaExpirada,
  dashboardRefresh, usuarioActualizado, sesionForzadaLogout,
  facturaCreada, facturaEstadoCambiado,
  garantiaCreada, garantiaEstadoCambiado,
  notificarError, notificarInfo, tiendaCompraSimulada,
  ROOMS,
};
