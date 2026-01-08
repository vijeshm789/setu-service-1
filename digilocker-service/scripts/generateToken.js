#!/usr/bin/env node

/**
 * Helper script to generate JWT tokens for testing
 * Usage: node scripts/generateToken.js <userId>
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node scripts/generateToken.js <userId>');
  process.exit(1);
}

const token = jwt.sign(
  { userId },
  config.jwt.secret,
  { expiresIn: config.jwt.expiry }
);

console.log('\n=== JWT Token Generated ===\n');
console.log('User ID:', userId);
console.log('Expires In:', config.jwt.expiry);
console.log('\nToken:');
console.log(token);
console.log('\n=== Usage ===\n');
console.log('Authorization: Bearer ' + token);
console.log('\nOr with curl:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/digilocker/auth-url`);
console.log('\n');
