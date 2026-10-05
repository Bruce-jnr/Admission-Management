const express = require('express');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { pool } = require('../db/connection');
const { cookieOptions, requireAdminAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rate-limit');
const { issueAdmission, admitPendingStudents } = require('../services/admissions');
const { parsePositiveId, validateStudent } = require('../services/validation');
const { verifyPassword } = require('../services/password');
const { decryptPIN } = require('../services/pin-encryption');

const router = express.Router();
const loginLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 10, message: 'Too many login attempts. Try again later.' });

router.get('/login', (req, res) => res.render('admin_login', { error: null }));

router.post('/login', loginLimiter, async (req, res, next) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  try {
    const [users] = await pool.execute(
      'SELECT id, password_hash, token_version FROM admin_users WHERE username = ? AND active = 1 LIMIT 1',
      [username]
    );
    const user = users[0];
    if (!user || !(await verifyPassword(req.body.password, user.password_hash))) {
      return res.status(401).render('admin_login', { error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { adminId: user.id, tokenVersion: user.token_version },
      jwtSecret,
      { algorithm: 'HS256', expiresIn: '24h' },
    );
    res.cookie('adminToken', token, cookieOptions);
    return res.redirect('/admin');
  } catch (error) {
    return next(error);
  }
});

router.get('/', requireAdminAuth, async (req, res, next) => {
  try {
    const [students] = await pool.execute(
      `SELECT id, admission_number, full_name, phone_number, admitted,
              sms_status, sms_sent_at, sms_error, created_at, pin_ciphertext
       FROM students ORDER BY created_at DESC LIMIT 100`
    );
    if (req.admin.role === 'super_admin') {
      for (const student of students) student.visible_pin = decryptPIN(student.pin_ciphertext);
    }
    for (const student of students) delete student.pin_ciphertext;
    res.render('admin_dashboard', { students });
  } catch (error) {
    next(error);
  }
});

router.post('/add-student', requireAdminAuth, async (req, res, next) => {
  const { student, errors } = validateStudent(req.body);
  if (errors.length) return res.status(400).json({ success: false, message: errors.join('. ') });
  try {
    await pool.execute(
      'INSERT INTO students (admission_number, full_name, phone_number) VALUES (?, ?, ?)',
      [student.admissionNumber, student.fullName, student.phoneNumber]
    );
    return res.status(201).json({ success: true, message: 'Student added successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Admission number already exists' });
    return next(error);
  }
});

router.post('/admit/:id', requireAdminAuth, async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid student ID' });
  try {
    const result = await issueAdmission(id);
    const message = result.sms.success
      ? `${result.student.full_name} was admitted and the PIN was sent.`
      : `${result.student.full_name} was admitted, but SMS delivery failed. Use Resend PIN.`;
    return res.status(result.sms.success ? 200 : 202).json({ success: true, smsSent: result.sms.success, message });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return next(error);
  }
});

router.post('/resend-pin/:id', requireAdminAuth, async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid student ID' });
  try {
    const result = await issueAdmission(id, { resend: true });
    return res.status(result.sms.success ? 200 : 502).json({
      success: result.sms.success,
      message: result.sms.success ? 'A new PIN was sent.' : 'SMS delivery failed. Please try again.',
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    return next(error);
  }
});

router.post('/bulk-admit', requireAdminAuth, async (req, res, next) => {
  try {
    const results = await admitPendingStudents();
    if (!results.length) return res.status(409).json({ success: false, message: 'No pending students to admit' });
    const admitted = results.filter((item) => item.success).length;
    const sent = results.filter((item) => item.smsSent).length;
    return res.json({ success: true, message: `Admitted ${admitted} students; ${sent} PIN messages delivered.` });
  } catch (error) {
    return next(error);
  }
});

module.exports = { router };
