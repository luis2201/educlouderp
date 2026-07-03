const crypto = require('crypto');

function generateSessionToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

module.exports = {
  generateSessionToken,
  hashSessionToken
};
