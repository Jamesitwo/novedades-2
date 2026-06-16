const express = require('express');
const router = express.Router();
const { getSignature } = require('../controllers/cloudinary.controller');

router.get('/signature', getSignature);

module.exports = router;
