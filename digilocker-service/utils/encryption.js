const crypto = require('crypto');
const config = require('../config/config');

const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt sensitive data using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text in hex format
 */
const encrypt = (text) => {
  if (!text) return null;

  const key = Buffer.from(config.encryption.key, 'utf-8');
  const iv = Buffer.from(config.encryption.iv, 'utf-8');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
};

/**
 * Decrypt encrypted data
 * @param {string} encryptedText - Encrypted text in hex format
 * @returns {string} Decrypted text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return null;

  const key = Buffer.from(config.encryption.key, 'utf-8');
  const iv = Buffer.from(config.encryption.iv, 'utf-8');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
};

module.exports = {
  encrypt,
  decrypt,
};
