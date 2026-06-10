const express = require('express');
const router = express.Router();
const { getAll, create, remove } = require('../controllers/vistas.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', getAll);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;