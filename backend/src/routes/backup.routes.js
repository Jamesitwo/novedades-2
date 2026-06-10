const express = require('express');
const router = express.Router();
const { crearBackup, listarBackups } = require('../controllers/backup.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.post('/crear', adminOnly, crearBackup);
router.get('/listar', adminOnly, listarBackups);

module.exports = router;