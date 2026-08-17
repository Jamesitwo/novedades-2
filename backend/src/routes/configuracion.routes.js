const express = require('express');
const router = express.Router();
const { getPublicConfig, getConfiguracion, updateConfiguracion, testMeta } = require('../controllers/configuracion.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.get('/public', getPublicConfig);

router.use(authMiddleware);

router.get('/', adminOnly, getConfiguracion);
router.put('/', adminOnly, updateConfiguracion);
router.post('/meta-test', adminOnly, testMeta);

module.exports = router;