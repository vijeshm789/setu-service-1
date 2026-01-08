const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');
const digilockerRoutes = require('./digilockerRoutes');

/**
 * Mount all routes
 */
router.use('/', healthRoutes);
router.use('/digilocker', digilockerRoutes);

module.exports = router;
