const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma/client');

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

      if (!token) {
        return next(new Error('Token de autenticación requerido'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const sesion = await prisma.sesion.findFirst({
        where: { token, activa: true }
      });

      if (!sesion) {
        return next(new Error('Sesión inválida o expirada'));
      }

      socket.userId = decoded.id;
      socket.userRol = decoded.rol;
      socket.userNombre = decoded.nombre;
      next();
    } catch (error) {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const rol = socket.userRol;

    console.log(`[WS] Usuario conectado: ${socket.userNombre} (${userId})`);

    socket.join(`user:${userId}`);
    connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1);

    if (rol === 'admin') {
      socket.join('admin');
    }

    socket.join('novedades');
    socket.join('oficina');
    socket.join('tareas');

    socket.emit('system:connected', {
      userId,
      rol,
      mensaje: 'Conectado en tiempo real',
      usuariosConectados: connectedUsers.size
    });

    socket.to('admin').emit('system:user-online', {
      userId,
      nombre: socket.userNombre,
      totalConectados: connectedUsers.size
    });

    socket.on('disconnect', () => {
      const count = connectedUsers.get(userId) - 1;
      if (count <= 0) {
        connectedUsers.delete(userId);
        console.log(`[WS] Usuario desconectado: ${socket.userNombre} (${userId})`);
        socket.to('admin').emit('system:user-offline', {
          userId,
          nombre: socket.userNombre,
          totalConectados: connectedUsers.size
        });
      } else {
        connectedUsers.set(userId, count);
      }
    });

    socket.on('join:record', (recordId) => {
      if (recordId) {
        socket.join(`record:${recordId}`);
      }
    });

    socket.on('leave:record', (recordId) => {
      if (recordId) {
        socket.leave(`record:${recordId}`);
      }
    });
  });

  console.log('[WS] WebSocket inicializado');
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado. Llama a init(server) primero.');
  }
  return io;
}

function getConnectedCount() {
  return connectedUsers.size;
}

function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

function emitToAdmins(event, data) {
  if (!io) return;
  io.to('admin').emit(event, data);
}

function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
}

function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

// --- Novedades ---

function novedadCreada(novedad, usuario) {
  emitToAll('novedad:created', { novedad, usuario: usuario.nombre });
  emitToRoom('novedades', 'dashboard:refresh', { motivo: 'novedad_creada' });
  if (novedad.asignadoId) {
    emitToUser(novedad.asignadoId, 'notificacion', {
      tipo: 'nueva_asignacion',
      mensaje: `${usuario.nombre} te asignó una novedad de ${novedad.nombre} ${novedad.apellido}`,
      registroId: novedad.id,
      tabla: 'pedidos_novedad'
    });
  }
}

function novedadActualizada(id, cambios, usuario) {
  emitToRoom('novedades', 'novedad:updated', { id, cambios, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'novedad:updated', { id, cambios, usuario: usuario.nombre });
}

function novedadEstadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
  emitToRoom('novedades', 'novedad:estado-changed', {
    id, estadoAnterior, estadoNuevo, usuario: usuario.nombre
  });
  emitToRoom(`record:${id}`, 'novedad:estado-changed', {
    id, estadoAnterior, estadoNuevo, usuario: usuario.nombre
  });
  emitToRoom('novedades', 'dashboard:refresh', { motivo: 'estado_cambiado' });
}

function novedadEliminada(id, usuario) {
  emitToRoom('novedades', 'novedad:deleted', { id, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'novedad:deleted', { id });
}

function novedadTransferida(id, deUsuario, aUsuarioId, aUsuarioNombre, registro) {
  emitToRoom('novedades', 'novedad:transferred', {
    id, deUsuario: deUsuario.nombre, aUsuarioId, aUsuarioNombre
  });
  emitToUser(aUsuarioId, 'notificacion', {
    tipo: 'transferencia',
    mensaje: `${deUsuario.nombre} te transfirió una novedad de ${registro?.nombre || ''} ${registro?.apellido || ''}`,
    registroId: id,
    tabla: 'pedidos_novedad'
  });
  emitToRoom('novedades', 'dashboard:refresh', { motivo: 'transferencia' });
}

function novedadBulkAction(accion, ids, usuario) {
  emitToRoom('novedades', 'novedad:bulk-action', {
    accion, ids, usuario: usuario.nombre
  });
  emitToRoom('novedades', 'dashboard:refresh', { motivo: 'bulk_action' });
}

function novedadEtiquetaChanged(id, usuario) {
  emitToRoom('novedades', 'novedad:etiqueta-changed', { id, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'novedad:etiqueta-changed', { id });
}

// --- Oficina ---

function oficinaCreada(pedido, usuario) {
  emitToAll('oficina:created', { pedido, usuario: usuario.nombre });
  emitToRoom('oficina', 'dashboard:refresh', { motivo: 'oficina_creada' });
  if (pedido.asignadoId) {
    emitToUser(pedido.asignadoId, 'notificacion', {
      tipo: 'nueva_asignacion',
      mensaje: `${usuario.nombre} te asignó un pedido de oficina de ${pedido.nombre} ${pedido.apellido}`,
      registroId: pedido.id,
      tabla: 'pedidos_oficina'
    });
  }
}

function oficinaActualizada(id, cambios, usuario) {
  emitToRoom('oficina', 'oficina:updated', { id, cambios, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'oficina:updated', { id, cambios, usuario: usuario.nombre });
}

function oficinaEstadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
  emitToRoom('oficina', 'oficina:estado-changed', {
    id, estadoAnterior, estadoNuevo, usuario: usuario.nombre
  });
  emitToRoom(`record:${id}`, 'oficina:estado-changed', {
    id, estadoAnterior, estadoNuevo, usuario: usuario.nombre
  });
  emitToRoom('oficina', 'dashboard:refresh', { motivo: 'estado_cambiado' });
}

function oficinaEliminada(id, usuario) {
  emitToRoom('oficina', 'oficina:deleted', { id, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'oficina:deleted', { id });
}

function oficinaTransferida(id, deUsuario, aUsuarioId, aUsuarioNombre, registro) {
  emitToRoom('oficina', 'oficina:transferred', {
    id, deUsuario: deUsuario.nombre, aUsuarioId, aUsuarioNombre
  });
  emitToUser(aUsuarioId, 'notificacion', {
    tipo: 'transferencia',
    mensaje: `${deUsuario.nombre} te transfirió un pedido de oficina de ${registro?.nombre || ''} ${registro?.apellido || ''}`,
    registroId: id,
    tabla: 'pedidos_oficina'
  });
  emitToRoom('oficina', 'dashboard:refresh', { motivo: 'transferencia' });
}

function oficinaBulkAction(accion, ids, usuario) {
  emitToRoom('oficina', 'oficina:bulk-action', {
    accion, ids, usuario: usuario.nombre
  });
  emitToRoom('oficina', 'dashboard:refresh', { motivo: 'bulk_action' });
}

function oficinaEtiquetaChanged(id, usuario) {
  emitToRoom('oficina', 'oficina:etiqueta-changed', { id, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'oficina:etiqueta-changed', { id });
}

// --- Tareas (Kanban) ---

function tareaCreada(tarea, usuario) {
  emitToRoom('tareas', 'tarea:created', { tarea, usuario: usuario.nombre });
  if (tarea.asignadoId) {
    emitToUser(tarea.asignadoId, 'notificacion', {
      tipo: 'nueva_tarea',
      mensaje: `${usuario.nombre} te asignó una tarea: ${tarea.titulo}`,
      registroId: tarea.id,
      tabla: 'tareas'
    });
  }
}

function tareaActualizada(id, cambios, usuario) {
  emitToRoom('tareas', 'tarea:updated', { id, cambios, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'tarea:updated', { id, cambios, usuario: usuario.nombre });
}

function tareaEstadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
  emitToRoom('tareas', 'tarea:estado-changed', {
    id, estadoAnterior, estadoNuevo, usuario: usuario.nombre
  });
  emitToRoom(`record:${id}`, 'tarea:estado-changed', {
    id, estadoAnterior, estadoNuevo, usuario: usuario.nombre
  });
}

function tareaEliminada(id, usuario) {
  emitToRoom('tareas', 'tarea:deleted', { id, usuario: usuario.nombre });
  emitToRoom(`record:${id}`, 'tarea:deleted', { id });
}

// --- WhatsApp ---

function whatsappMensajeRecibido(tabla, registroId, mensaje) {
  emitToRoom('novedades', 'whatsapp:message-received', { tabla, registroId, mensaje });
  emitToRoom('oficina', 'whatsapp:message-received', { tabla, registroId, mensaje });
  emitToRoom(`record:${registroId}`, 'whatsapp:message-received', { tabla, registroId, mensaje });
}

function whatsappMensajeEnviado(tabla, registroId, mensaje, usuarioId) {
  emitToRoom(`record:${registroId}`, 'whatsapp:message-sent', { tabla, registroId, mensaje });
  if (usuarioId) {
    emitToUser(usuarioId, 'whatsapp:message-sent', { tabla, registroId, mensaje });
  }
}

function whatsappVentanaExpirada(tabla, registroId) {
  emitToRoom(`record:${registroId}`, 'whatsapp:window-expired', { tabla, registroId });
  emitToRoom('novedades', 'whatsapp:window-expired', { tabla, registroId });
  emitToRoom('oficina', 'whatsapp:window-expired', { tabla, registroId });
}

// --- Dashboard ---

function dashboardRefresh(motivo) {
  emitToRoom('novedades', 'dashboard:refresh', { motivo, timestamp: new Date().toISOString() });
  emitToRoom('oficina', 'dashboard:refresh', { motivo, timestamp: new Date().toISOString() });
}

// --- Usuarios / Sesiones ---

function usuarioActualizado(id, usuario) {
  emitToAdmins('usuario:updated', { id, usuario: usuario.nombre });
}

function sesionForzadaLogout(usuarioId) {
  emitToUser(usuarioId, 'sesion:forced-logout', {
    mensaje: 'Tu sesión ha sido cerrada por un administrador',
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

// --- Garantías ---

function garantiaCreada(garantia) {
  emitToAdmins('garantia:created', { garantia });
}

function garantiaEstadoCambiado(id, estadoAnterior, estadoNuevo, usuario) {
  emitToAdmins('garantia:estado-changed', { id, estadoAnterior, estadoNuevo, usuario: usuario?.nombre });
}

// --- Sistema ---

function notificarError(usuarioId, mensaje) {
  if (usuarioId) {
    emitToUser(usuarioId, 'system:error', { mensaje });
  }
}

function notificarInfo(mensaje) {
  emitToAll('system:info', { mensaje, timestamp: new Date().toISOString() });
}

function tiendaCompraSimulada(productoNombre) {
  if (!io) return;
  const hace = Math.floor(Math.random() * 30) + 1;
  const mensaje = productoNombre
    ? `Alguien acaba de comprar "${productoNombre}"`
    : '¡Alguien acaba de hacer una compra!';
  io.emit('tienda:compra-simulada', {
    mensaje,
    hace: `${hace} min`
  });
}

module.exports = {
  init,
  getIO,
  getConnectedCount,
  isUserOnline,
  emitToUser,
  emitToAdmins,
  emitToRoom,
  emitToAll,

  novedadCreada,
  novedadActualizada,
  novedadEstadoCambiado,
  novedadEliminada,
  novedadTransferida,
  novedadBulkAction,
  novedadEtiquetaChanged,

  oficinaCreada,
  oficinaActualizada,
  oficinaEstadoCambiado,
  oficinaEliminada,
  oficinaTransferida,
  oficinaBulkAction,
  oficinaEtiquetaChanged,

  tareaCreada,
  tareaActualizada,
  tareaEstadoCambiado,
  tareaEliminada,

  whatsappMensajeRecibido,
  whatsappMensajeEnviado,
  whatsappVentanaExpirada,

  dashboardRefresh,

  usuarioActualizado,
  sesionForzadaLogout,

  facturaCreada,
  facturaEstadoCambiado,

  garantiaCreada,
  garantiaEstadoCambiado,

  notificarError,
  notificarInfo,
  tiendaCompraSimulada
};
