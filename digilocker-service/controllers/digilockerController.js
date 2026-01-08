const digilockerService = require('../services/digilockerService');
const logger = require('../utils/logger');

/**
 * GET /digilocker/auth-url
 * Generate DigiLocker authorization URL
 */
const getAuthUrl = async (req, res, next) => {
  try {
    const userId = req.userId; // From JWT middleware

    const { authUrl, state } = digilockerService.generateAuthUrl(userId);

    res.status(200).json({
      success: true,
      data: {
        authUrl,
        state,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /digilocker/callback
 * Handle OAuth callback from DigiLocker
 */
const handleCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing code or state parameter',
      });
    }

    const result = await digilockerService.exchangeCodeForToken(code, state);

    res.status(200).json({
      success: true,
      message: 'DigiLocker authorization successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /digilocker/documents/issued
 * Fetch issued documents from DigiLocker
 */
const getIssuedDocuments = async (req, res, next) => {
  try {
    const userId = req.userId; // From JWT middleware

    const documents = await digilockerService.getIssuedDocuments(userId);

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /digilocker/documents/uploaded
 * Fetch uploaded documents from DigiLocker
 */
const getUploadedDocuments = async (req, res, next) => {
  try {
    const userId = req.userId; // From JWT middleware

    const documents = await digilockerService.getUploadedDocuments(userId);

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /digilocker/documents/download/:uri
 * Download document from DigiLocker
 */
const downloadDocument = async (req, res, next) => {
  try {
    const userId = req.userId; // From JWT middleware
    const { uri } = req.params;

    if (!uri) {
      return res.status(400).json({
        success: false,
        message: 'Document URI is required',
      });
    }

    const document = await digilockerService.downloadDocument(userId, uri);

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthUrl,
  handleCallback,
  getIssuedDocuments,
  getUploadedDocuments,
  downloadDocument,
};
