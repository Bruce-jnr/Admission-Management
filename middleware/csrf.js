const crypto = require('crypto');
const { isProduction } = require('../config');

function csrfToken(req, res, next) {
  let token = req.cookies?.csrfToken;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });
  }
  res.locals.csrfToken = token;
  next();
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireCsrf(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const supplied = req.get('x-csrf-token') || req.body?._csrf;
  if (!safeEqual(req.cookies?.csrfToken, supplied)) {
    if (req.accepts(['json', 'html']) === 'json') {
      return res.status(403).json({ success: false, message: 'Invalid security token' });
    }
    return res.status(403).send('Invalid security token. Reload the page and try again.');
  }
  next();
}

module.exports = { csrfToken, requireCsrf, safeEqual };
