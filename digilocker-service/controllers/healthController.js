const mongoose = require('mongoose');

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'digilocker-service',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };

  res.status(200).json(health);
};

module.exports = {
  healthCheck,
};
