const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');
const config = require('../config/config');
const UserDigiLocker = require('../models/UserDigiLocker');
const { encrypt, decrypt } = require('../utils/encryption');
const AppError = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Generate DigiLocker authorization URL
 * @param {string} userId - User ID
 * @returns {Object} Authorization URL and state
 */
const generateAuthUrl = (userId) => {
  // Generate random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  const params = {
    client_id: config.digilocker.clientId,
    redirect_uri: config.digilocker.redirectUri,
    response_type: 'code',
    state: `${state}:${userId}`, // Embed userId in state
  };

  const authUrl = `${config.digilocker.authUrl}?${querystring.stringify(params)}`;

  logger.info('Generated DigiLocker auth URL', { userId });

  return {
    authUrl,
    state,
  };
};

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code
 * @param {string} state - State parameter
 * @returns {Object} Token data
 */
const exchangeCodeForToken = async (code, state) => {
  try {
    // Extract userId from state
    const [stateToken, userId] = state.split(':');

    if (!userId) {
      throw new AppError('Invalid state parameter', 400);
    }

    const params = {
      client_id: config.digilocker.clientId,
      client_secret: config.digilocker.clientSecret,
      code,
      redirect_uri: config.digilocker.redirectUri,
      grant_type: 'authorization_code',
    };

    logger.info('Exchanging code for token', { userId });

    const response = await axios.post(
      config.digilocker.tokenUrl,
      querystring.stringify(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token || !refresh_token) {
      throw new AppError('Failed to retrieve tokens from DigiLocker', 500);
    }

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Encrypt tokens before saving
    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = encrypt(refresh_token);

    // Upsert: Update if exists, create if not (ONE record per user)
    await UserDigiLocker.findOneAndUpdate(
      { userId },
      {
        userId,
        digilockerClientId: config.digilocker.clientId,
        digilockerAccessToken: encryptedAccessToken,
        digilockerRefreshToken: encryptedRefreshToken,
        tokenExpiry,
      },
      { upsert: true, new: true }
    );

    logger.info('DigiLocker tokens saved successfully', { userId });

    return {
      userId,
      success: true,
    };
  } catch (error) {
    logger.error('Error exchanging code for token', error);
    if (error.response) {
      throw new AppError(
        `DigiLocker API error: ${error.response.data.message || error.response.statusText}`,
        error.response.status
      );
    }
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} userId - User ID
 * @returns {Object} New token data
 */
const refreshAccessToken = async (userId) => {
  try {
    const userDigiLocker = await UserDigiLocker.findOne({ userId });

    if (!userDigiLocker) {
      throw new AppError('DigiLocker credentials not found for user', 404);
    }

    const refreshToken = decrypt(userDigiLocker.digilockerRefreshToken);

    const params = {
      client_id: config.digilocker.clientId,
      client_secret: config.digilocker.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    };

    logger.info('Refreshing access token', { userId });

    const response = await axios.post(
      config.digilocker.tokenUrl,
      querystring.stringify(params),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : userDigiLocker.digilockerRefreshToken;

    userDigiLocker.digilockerAccessToken = encryptedAccessToken;
    userDigiLocker.digilockerRefreshToken = encryptedRefreshToken;
    userDigiLocker.tokenExpiry = tokenExpiry;

    await userDigiLocker.save();

    logger.info('Access token refreshed successfully', { userId });

    return access_token;
  } catch (error) {
    logger.error('Error refreshing access token', error);
    if (error.response) {
      throw new AppError(
        `DigiLocker API error: ${error.response.data.message || error.response.statusText}`,
        error.response.status
      );
    }
    throw error;
  }
};

/**
 * Get valid access token (refresh if expired)
 * @param {string} userId - User ID
 * @returns {string} Valid access token
 */
const getValidAccessToken = async (userId) => {
  const userDigiLocker = await UserDigiLocker.findOne({ userId });

  if (!userDigiLocker) {
    throw new AppError('DigiLocker not linked. Please authorize first.', 404);
  }

  // Check if token is expired or about to expire (5 minutes buffer)
  const now = new Date();
  const expiryBuffer = new Date(userDigiLocker.tokenExpiry.getTime() - 5 * 60 * 1000);

  if (now >= expiryBuffer) {
    logger.info('Token expired or expiring soon, refreshing', { userId });
    return await refreshAccessToken(userId);
  }

  return decrypt(userDigiLocker.digilockerAccessToken);
};

/**
 * Fetch issued documents from DigiLocker
 * @param {string} userId - User ID
 * @returns {Object} Issued documents
 */
const getIssuedDocuments = async (userId) => {
  try {
    const accessToken = await getValidAccessToken(userId);

    logger.info('Fetching issued documents', { userId });

    const response = await axios.get(`${config.digilocker.apiBaseUrl}/documents/issued`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    logger.error('Error fetching issued documents', error);
    if (error.response) {
      throw new AppError(
        `DigiLocker API error: ${error.response.data.message || error.response.statusText}`,
        error.response.status
      );
    }
    throw error;
  }
};

/**
 * Fetch uploaded documents from DigiLocker
 * @param {string} userId - User ID
 * @returns {Object} Uploaded documents
 */
const getUploadedDocuments = async (userId) => {
  try {
    const accessToken = await getValidAccessToken(userId);

    logger.info('Fetching uploaded documents', { userId });

    const response = await axios.get(`${config.digilocker.apiBaseUrl}/documents/uploaded`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    logger.error('Error fetching uploaded documents', error);
    if (error.response) {
      throw new AppError(
        `DigiLocker API error: ${error.response.data.message || error.response.statusText}`,
        error.response.status
      );
    }
    throw error;
  }
};

/**
 * Download document from DigiLocker
 * @param {string} userId - User ID
 * @param {string} uri - Document URI
 * @returns {Object} Document data
 */
const downloadDocument = async (userId, uri) => {
  try {
    const accessToken = await getValidAccessToken(userId);

    logger.info('Downloading document', { userId, uri });

    const response = await axios.get(
      `${config.digilocker.apiBaseUrl}/documents/download`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          uri,
        },
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Error downloading document', error);
    if (error.response) {
      throw new AppError(
        `DigiLocker API error: ${error.response.data.message || error.response.statusText}`,
        error.response.status
      );
    }
    throw error;
  }
};

/**
 * Create or update UserDigiLocker record manually
 * @param {string} userId - User ID
 * @param {string} accessToken - DigiLocker access token
 * @param {string} refreshToken - DigiLocker refresh token
 * @param {number} expiresIn - Token expiry in seconds
 * @returns {Object} Created/updated record
 */
const createUserDigiLocker = async (userId, accessToken, refreshToken, expiresIn) => {
  try {
    if (!userId || !accessToken || !refreshToken) {
      throw new AppError('userId, accessToken, and refreshToken are required', 400);
    }

    // Calculate token expiry
    const tokenExpiry = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

    // Encrypt tokens before saving
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = encrypt(refreshToken);

    logger.info('Creating/updating UserDigiLocker record', { userId });

    // Upsert: Update if exists, create if not (ONE record per user)
    const userDigiLocker = await UserDigiLocker.findOneAndUpdate(
      { userId },
      {
        userId,
        digilockerClientId: config.digilocker.clientId,
        digilockerAccessToken: encryptedAccessToken,
        digilockerRefreshToken: encryptedRefreshToken,
        tokenExpiry,
      },
      { upsert: true, new: true }
    );

    logger.info('UserDigiLocker record created/updated successfully', { userId });

    return {
      userId: userDigiLocker.userId,
      digilockerClientId: userDigiLocker.digilockerClientId,
      tokenExpiry: userDigiLocker.tokenExpiry,
      createdAt: userDigiLocker.createdAt,
      updatedAt: userDigiLocker.updatedAt,
    };
  } catch (error) {
    logger.error('Error creating UserDigiLocker record', error);
    throw error;
  }
};

/**
 * Get UserDigiLocker record for a user
 * @param {string} userId - User ID
 * @returns {Object} UserDigiLocker record (without sensitive data)
 */
const getUserDigiLocker = async (userId) => {
  try {
    const userDigiLocker = await UserDigiLocker.findOne({ userId });

    if (!userDigiLocker) {
      throw new AppError('DigiLocker credentials not found for user', 404);
    }

    logger.info('Retrieved UserDigiLocker record', { userId });

    return {
      userId: userDigiLocker.userId,
      digilockerClientId: userDigiLocker.digilockerClientId,
      tokenExpiry: userDigiLocker.tokenExpiry,
      isTokenExpired: new Date() >= userDigiLocker.tokenExpiry,
      createdAt: userDigiLocker.createdAt,
      updatedAt: userDigiLocker.updatedAt,
    };
  } catch (error) {
    logger.error('Error retrieving UserDigiLocker record', error);
    throw error;
  }
};

/**
 * Delete UserDigiLocker record for a user
 * @param {string} userId - User ID
 * @returns {Object} Deletion result
 */
const deleteUserDigiLocker = async (userId) => {
  try {
    const result = await UserDigiLocker.findOneAndDelete({ userId });

    if (!result) {
      throw new AppError('DigiLocker credentials not found for user', 404);
    }

    logger.info('UserDigiLocker record deleted', { userId });

    return {
      success: true,
      message: 'DigiLocker credentials deleted successfully',
    };
  } catch (error) {
    logger.error('Error deleting UserDigiLocker record', error);
    throw error;
  }
};

module.exports = {
  generateAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getValidAccessToken,
  getIssuedDocuments,
  getUploadedDocuments,
  downloadDocument,
  createUserDigiLocker,
  getUserDigiLocker,
  deleteUserDigiLocker,
};
