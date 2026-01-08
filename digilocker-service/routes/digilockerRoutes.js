const express = require('express');
const router = express.Router();
const digilockerController = require('../controllers/digilockerController');

/**
 * GET /digilocker/documents/issued
 * Fetch issued documents from DigiLocker
 * Query param: userId
 */
router.get('/documents/issued', digilockerController.getIssuedDocuments);

/**
 * GET /digilocker/documents/uploaded
 * Fetch uploaded documents from DigiLocker
 * Query param: userId
 */
router.get('/documents/uploaded', digilockerController.getUploadedDocuments);

/**
 * GET /digilocker/documents/download/:uri
 * Download document from DigiLocker
 * Query param: userId
 */
router.get('/documents/download/:uri', digilockerController.downloadDocument);

/**
 * POST /digilocker/user
 * Create or update UserDigiLocker record manually
 * Body: userId, clientId, clientSecret, accessToken, refreshToken, expiresIn
 */
router.post('/user', digilockerController.createUserDigiLocker);

/**
 * GET /digilocker/user
 * Get UserDigiLocker record
 * Query param: userId
 */
router.get('/user', digilockerController.getUserDigiLocker);

/**
 * DELETE /digilocker/user
 * Delete UserDigiLocker record
 * Query param: userId
 */
router.delete('/user', digilockerController.deleteUserDigiLocker);

module.exports = router;
