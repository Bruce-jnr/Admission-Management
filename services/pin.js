const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

function generatePIN() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function hashPIN(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(pin, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

async function verifyPIN(pin, storedHash) {
  if (!storedHash) return false;
  const [algorithm, salt, expectedHex] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = await scrypt(pin, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { generatePIN, hashPIN, verifyPIN };
