const express = require('express');
const router = express.Router();
const digilockerController = require('../controllers/digilockerController');
const { authenticate } = require('../middlewares/auth');

/**
 * GET /digilocker/documents/issued
 * Fetch issued documents from DigiLocker
 * Protected: Requires JWT authentication
 */
router.get('/documents/issued', authenticate, digilockerController.getIssuedDocuments);

/**
 * GET /digilocker/documents/uploaded
 * Fetch uploaded documents from DigiLocker
 * Protected: Requires JWT authentication
 */
router.get('/documents/uploaded', authenticate, digilockerController.getUploadedDocuments);

/**
 * GET /digilocker/documents/download/:uri
 * Download document from DigiLocker
 * Protected: Requires JWT authentication
 */
router.get('/documents/download/:uri', authenticate, digilockerController.downloadDocument);

/**
 * POST /digilocker/user
 * Create or update UserDigiLocker record manually
 * Protected: Requires JWT authentication
 */
router.post('/user', authenticate, digilockerController.createUserDigiLocker);

/**
 * GET /digilocker/user
 * Get UserDigiLocker record for authenticated user
 * Protected: Requires JWT authentication
 */
router.get('/user', authenticate, digilockerController.getUserDigiLocker);

/**
 * DELETE /digilocker/user
 * Delete UserDigiLocker record for authenticated user
 * Protected: Requires JWT authentication
 */
router.delete('/user', authenticate, digilockerController.deleteUserDigiLocker);

module.exports = router;
