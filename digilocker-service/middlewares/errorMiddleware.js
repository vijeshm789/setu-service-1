const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  logger.error('Request error', err, {
    path: req.path,
    method: req.method,
    statusCode: err.statusCode,
  });

  const response = {
    success: false,
    message: err.message,
  };

  // Include stack trace in development mode
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

module.exports = errorMiddleware;
