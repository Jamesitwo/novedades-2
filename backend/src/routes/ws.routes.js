const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');
const wsService = require('../services/websocket.service');

const router = Router();

router.get('/status', authMiddleware, (req, res) => {
  const connectedCount = wsService.getConnectedCount();
  res.json({
    websocket: 'active',
    usuariosConectados: connectedCount,
    timestamp: new Date().toISOString()
  });
});

router.get('/connected-users', authMiddleware, adminOnly, (req, res) => {
  const connectedCount = wsService.getConnectedCount();
  const io = wsService.getIO();
  const sockets = Array.from(io.sockets.sockets.values()).map(s => ({
    userId: s.userId,
    rol: s.userRol,
    nombre: s.userNombre,
    connectedAt: s.handshake.issued
  }));
  res.json({
    total: connectedCount,
    usuarios: sockets
  });
});

module.exports = router;
