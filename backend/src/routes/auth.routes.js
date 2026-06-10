const express = require('express');
const router = express.Router();
const { login, logout, me, changePassword } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.put('/password', authMiddleware, changePassword);

module.exports = router;