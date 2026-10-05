const express = require('express');
const { pool } = require('../db/connection');
const { requireAdminAuth, requireSuperAdmin } = require('../middleware/auth');
const { hashPassword, validatePassword } = require('../services/password');
const { parsePositiveId } = require('../services/validation');

const router = express.Router();
router.use(requireAdminAuth, requireSuperAdmin);

function validateAccount(input = {}) {
  const username = String(input.username || '').trim().toLowerCase();
  const fullName = String(input.full_name || '').trim().replace(/\s+/g, ' ');
  const errors = [];
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) errors.push('Username must be 3-50 lowercase letters, numbers, dots, underscores, or hyphens');
  if (fullName.length < 2 || fullName.length > 100) errors.push('Full name must be 2-100 characters');
  return { username, fullName, errors };
}

router.get('/', async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, username, full_name, role, active, created_at, updated_at
       FROM admin_users ORDER BY role DESC, full_name`
    );
    return res.render('admin_users', { users });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { username, fullName, errors } = validateAccount(req.body);
  const passwordError = validatePassword(req.body.password);
  if (passwordError) errors.push(passwordError);
  if (errors.length) return res.status(400).json({ success: false, message: errors.join('. ') });
  try {
    await pool.execute(
      `INSERT INTO admin_users (username, full_name, password_hash, role)
       VALUES (?, ?, ?, 'admin')`,
      [username, fullName, await hashPassword(req.body.password)]
    );
    return res.status(201).json({ success: true, message: 'Administrator created' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Username already exists' });
    return next(error);
  }
});

router.post('/:id/update', async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  const { username, fullName, errors } = validateAccount(req.body);
  if (!id) errors.push('Invalid user ID');
  if (errors.length) return res.status(400).json({ success: false, message: errors.join('. ') });
  try {
    const [result] = await pool.execute(
      'UPDATE admin_users SET username = ?, full_name = ? WHERE id = ?',
      [username, fullName, id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: 'User updated' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Username already exists' });
    return next(error);
  }
});

router.post('/:id/reset-password', async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  const passwordError = validatePassword(req.body.password);
  if (!id || passwordError) return res.status(400).json({ success: false, message: passwordError || 'Invalid user ID' });
  try {
    const [result] = await pool.execute(
      'UPDATE admin_users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
      [await hashPassword(req.body.password), id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/toggle', async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid user ID' });
  if (id === req.admin.id) return res.status(409).json({ success: false, message: 'You cannot disable your own account' });
  try {
    const [result] = await pool.execute(
      "UPDATE admin_users SET active = NOT active, token_version = token_version + 1 WHERE id = ? AND role = 'admin'",
      [id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Regular administrator not found' });
    return res.json({ success: true, message: 'Account status updated' });
  } catch (error) {
    return next(error);
  }
});

module.exports = { router, validateAccount };
