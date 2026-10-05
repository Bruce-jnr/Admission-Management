const crypto = require('crypto');
const { pinEncryptionSecret } = require('../config');

if (!pinEncryptionSecret) {
  throw new Error('PIN_ENCRYPTION_SECRET is not configured');
}

const key = crypto.createHash('sha256').update(pinEncryptionSecret).digest();
function encryptPIN(pin) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPIN(value) {
  if (!value) return null;
  try {
    const [version, ivHex, tagHex, encryptedHex] = value.split(':');
    if (version !== 'v1' || !ivHex || !tagHex || !encryptedHex) return null;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encryptPIN, decryptPIN };
