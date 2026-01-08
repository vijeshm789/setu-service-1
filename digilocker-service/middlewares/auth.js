const jwt = require('jsonwebtoken');
const config = require('../config/config');
const AppError = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Validates internal JWT token and extracts userId
 */
const authenticate = (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization token is required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Invalid authorization format', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret);

    if (!decoded.userId) {
      throw new AppError('Invalid token payload', 401);
    }

    // Attach userId to request object
    req.userId = decoded.userId;
    req.user = decoded;

    logger.debug('JWT authentication successful', { userId: req.userId });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

/**
 * Generate JWT token for a user
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiry }
  );
};

module.exports = {
  authenticate,
  generateToken,
};
