const express = require('express');
const router = express.Router();
const { getConfiguracion, updateConfiguracion } = require('../controllers/configuracion.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/', adminOnly, getConfiguracion);
router.put('/', adminOnly, updateConfiguracion);

module.exports = router;