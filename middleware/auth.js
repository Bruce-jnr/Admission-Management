const jwt = require('jsonwebtoken');
const { jwtSecret, isProduction } = require('../config');
const { pool } = require('../db/connection');

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

function verifyCookie(cookieName, loginPath, claim) {
  return (req, res, next) => {
    try {
      const token = req.cookies?.[cookieName];
      if (!token) return res.redirect(loginPath);
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      req[claim] = decoded[claim];
      return next();
    } catch {
      res.clearCookie(cookieName, { path: '/' });
      return res.redirect(loginPath);
    }
  };
}

module.exports = {
  cookieOptions,
  requireAdminAuth: async (req, res, next) => {
    try {
      const token = req.cookies?.adminToken;
      if (!token) return res.redirect('/admin/login');
      const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      const [users] = await pool.execute(
        'SELECT id, username, full_name, role, token_version FROM admin_users WHERE id = ? AND active = 1',
        [decoded.adminId]
      );
      if (!users[0] || decoded.tokenVersion !== users[0].token_version)
        throw new Error('Admin session is no longer valid');
      req.admin = users[0];
      req.adminId = users[0].id;
      res.locals.admin = users[0];
      return next();
    } catch {
      res.clearCookie('adminToken', { path: '/' });
      return res.redirect('/admin/login');
    }
  },
  requireSuperAdmin: (req, res, next) => {
    if (req.admin?.role !== 'super_admin') {
      if (req.accepts(['json', 'html']) === 'json') return res.status(403).json({ success: false, message: 'Super admin access required' });
      return res.status(403).send('Super admin access required');
    }
    return next();
  },
  requireStudentAuth: verifyCookie('studentToken', '/student/login', 'studentId'),
};
