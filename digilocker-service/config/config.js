require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/digilocker-service',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '24h',
  },

  digilocker: {
    clientId: process.env.DIGILOCKER_CLIENT_ID,
    clientSecret: process.env.DIGILOCKER_CLIENT_SECRET,
    redirectUri: process.env.DIGILOCKER_REDIRECT_URI,
    authUrl: process.env.DIGILOCKER_AUTH_URL,
    tokenUrl: process.env.DIGILOCKER_TOKEN_URL,
    apiBaseUrl: process.env.DIGILOCKER_API_BASE_URL,
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY,
    iv: process.env.ENCRYPTION_IV,
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
  },
};
