const express = require('express');
const router = express.Router();
const { getAll, create, toggleActivo, remove } = require('../controllers/apikey.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { adminOnly } = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/', adminOnly, getAll);
router.post('/', adminOnly, create);
router.patch('/:id/toggle', adminOnly, toggleActivo);
router.delete('/:id', adminOnly, remove);

module.exports = router;