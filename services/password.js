const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;
  const [algorithm, salt, expectedHex] = storedHash.split(':');
  if (
    algorithm !== 'scrypt' ||
    !salt ||
    !/^[a-f0-9]{128}$/.test(expectedHex || '')
  )
    return false;
  const actual = await scrypt(String(password || ''), salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return crypto.timingSafeEqual(actual, expected);
}

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must contain at least 8 characters';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value))
    return 'Password must include at least one letter and one number';
  return null;
}

module.exports = { hashPassword, verifyPassword, validatePassword };
