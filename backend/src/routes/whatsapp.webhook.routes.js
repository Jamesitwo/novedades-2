const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/whatsapp.controller');

router.get('/', ctrl.webhookVerify);
router.post('/', ctrl.webhookReceive);

module.exports = router;
