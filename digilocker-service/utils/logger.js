const config = require('../config/config');

const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  error: (message, error = {}, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        message: error.message,
        stack: config.nodeEnv === 'development' ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  debug: (message, meta = {}) => {
    if (config.nodeEnv === 'development') {
      console.debug(JSON.stringify({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }));
    }
  },
};

module.exports = logger;
