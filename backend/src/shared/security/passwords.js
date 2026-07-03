const crypto = require('crypto');

const SCRYPT_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');

  return `${SCRYPT_PREFIX}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [prefix, salt, hash] = String(storedHash || '').split('$');

  if (prefix !== SCRYPT_PREFIX || !salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, 'hex');

  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}

module.exports = {
  hashPassword,
  verifyPassword
};
