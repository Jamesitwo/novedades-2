const express = require('express');
const router = express.Router();
const { getAll, create, update, remove, bulkImport } = require('../controllers/pizdo.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/import', bulkImport);

module.exports = router;
