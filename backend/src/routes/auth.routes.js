const express = require('express');
const router = express.Router();
const { login, logout, me, changePassword } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { validateBody, loginSchema, changePasswordSchema } = require('../middlewares/validate.middleware');

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.put('/password', authMiddleware, validateBody(changePasswordSchema), changePassword);

module.exports = router;