const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(config.mongodb.uri, options);

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
