const digilockerService = require('../services/digilockerService');
const logger = require('../utils/logger');

/**
 * GET /digilocker/documents/issued
 * Fetch issued documents from DigiLocker
 */
const getIssuedDocuments = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required',
      });
    }

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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required',
      });
    }

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
    const { userId } = req.query;
    const { uri } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required',
      });
    }

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

/**
 * POST /digilocker/user
 * Create or update UserDigiLocker record manually
 */
const createUserDigiLocker = async (req, res, next) => {
  try {
    const { userId, clientId, clientSecret, accessToken, refreshToken, expiresIn } = req.body;

    if (!userId || !clientId || !clientSecret || !accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'userId, clientId, clientSecret, accessToken, and refreshToken are required',
      });
    }

    const result = await digilockerService.createUserDigiLocker(
      userId,
      clientId,
      clientSecret,
      accessToken,
      refreshToken,
      expiresIn
    );

    res.status(201).json({
      success: true,
      message: 'UserDigiLocker record created/updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /digilocker/user
 * Get UserDigiLocker record
 */
const getUserDigiLocker = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required',
      });
    }

    const result = await digilockerService.getUserDigiLocker(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /digilocker/user
 * Delete UserDigiLocker record
 */
const deleteUserDigiLocker = async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required',
      });
    }

    const result = await digilockerService.deleteUserDigiLocker(userId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIssuedDocuments,
  getUploadedDocuments,
  downloadDocument,
  createUserDigiLocker,
  getUserDigiLocker,
  deleteUserDigiLocker,
};
