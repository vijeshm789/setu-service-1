const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/config');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const logger = require('./utils/logger');

const app = express();

/**
 * Security Middleware
 */
app.use(helmet());

/**
 * CORS Configuration
 */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (config.cors.allowedOrigins.includes('*') || config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

/**
 * Body Parser Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Request Logging Middleware
 */
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

/**
 * Mount Routes
 */
app.use('/', routes);

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/**
 * Global Error Handler
 */
app.use(errorMiddleware);

/**
 * MongoDB Connection
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected successfully', { uri: config.mongodb.uri });
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

/**
 * Start Server
 */
const startServer = async () => {
  await connectDB();

  app.listen(config.port, () => {
    logger.info(`DigiLocker Service running on port ${config.port}`, {
      env: config.nodeEnv,
      port: config.port,
    });
  });
};

/**
 * Handle Unhandled Promise Rejections
 */
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection', error);
  process.exit(1);
});

/**
 * Handle Uncaught Exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
