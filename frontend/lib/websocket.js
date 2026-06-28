'use client';
import { io } from 'socket.io-client';

let socket = null;
let listeners = new Map();
let connectAttempts = 0;
const MAX_RECONNECT = 10;

function getApiUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) return apiUrl;
  return window.location.origin;
}

export function connect(token) {
  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  const url = getApiUrl();
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000
  });

  socket.on('connect', () => {
    console.log('[WS] Conectado:', socket.id);
    connectAttempts = 0;
    notifyListeners('__connect__', { id: socket.id });
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Desconectado:', reason);
    notifyListeners('__disconnect__', { reason });
  });

  socket.on('connect_error', (error) => {
    console.error('[WS] Error conexión:', error.message);
    connectAttempts++;
    notifyListeners('__error__', { message: error.message });
  });

  socket.on('system:connected', (data) => {
    notifyListeners('__system_connected__', data);
  });

  socket.on('notificacion', (data) => {
    notifyListeners('__notification__', data);
  });

  socket.on('sesion:forced-logout', () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
  });

  return socket;
}

export function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}

export function getSocket() {
  return socket;
}

export function isConnected() {
  return socket?.connected || false;
}

export function on(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);

  if (socket) {
    socket.on(event, handler);
  }

  return () => off(event, handler);
}

export function off(event, handler) {
  if (listeners.has(event)) {
    listeners.get(event).delete(handler);
  }
  if (socket) {
    socket.off(event, handler);
  }
}

function notifyListeners(event, data) {
  if (listeners.has(event)) {
    listeners.get(event).forEach(fn => {
      try { fn(data); } catch (e) { console.error('[WS] Listener error:', e); }
    });
  }
}

export function emit(event, data) {
  if (socket?.connected) {
    socket.emit(event, data);
  }
}

export function joinRecord(recordId) {
  if (socket?.connected && recordId) {
    socket.emit('join:record', recordId);
  }
}

export function leaveRecord(recordId) {
  if (socket?.connected && recordId) {
    socket.emit('leave:record', recordId);
  }
}
