const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ejs = require('ejs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admission_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function to generate 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// JWT Authentication Middleware
function requireAdminAuth(req, res, next) {
  try {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies?.adminToken;

    if (!token) {
      return res.redirect('/admin/login');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-jwt-secret'
    );
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    res.clearCookie('adminToken');
    res.redirect('/admin/login');
  }
}

function requireStudentAuth(req, res, next) {
  try {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies?.studentToken;

    if (!token) {
      return res.redirect('/student/login');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-jwt-secret'
    );

    console.log('JWT TOKEN DECODED - Student ID:', decoded.studentId);
    console.log(
      'JWT TOKEN DECODED - Admission Number:',
      decoded.admissionNumber
    );

    req.studentId = decoded.studentId;
    next();
  } catch (error) {
    console.log('JWT TOKEN ERROR:', error.message);
    res.clearCookie('studentToken');
    res.redirect('/student/login');
  }
}

// Routes
app.get('/', (req, res) => {
  res.render('admin_login', { error: null });
});

// Simple test route
app.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Application is running',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
  });
});

// Simple database test
app.get('/db-simple', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT DATABASE() as db_name');
    res.json({
      success: true,
      database: rows[0].db_name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
    });
  }
});

// Admin routes
app.get('/admin/login', (req, res) => {
  res.render('admin_login', { error: null });
});

app.post('/admin/login', async (req, res) => {
  const { password } = req.body;

  // Validate input parameters
  if (!password) {
    return res.render('admin_login', { error: 'Please provide a password' });
  }

  if (password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign(
      { adminId: 'admin', timestamp: Date.now() },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.redirect('/admin');
  } else {
    res.render('admin_login', { error: 'Invalid password' });
  }
});

app.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    // Add cache-busting headers
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Force fresh database query with explicit connection
    const connection = await pool.getConnection();
    try {
      const [students] = await connection.execute(
        'SELECT * FROM students ORDER BY created_at DESC LIMIT 100'
      );

      console.log(
        'Admin dashboard - FRESH QUERY - students count:',
        students.length
      );
      console.log(
        'Admin dashboard - FRESH QUERY - students:',
        students.map((s) => ({
          id: s.id,
          name: s.full_name,
          admission: s.admission_number,
        }))
      );

      res.render('admin_dashboard', { students });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Student routes
app.get('/student/login', (req, res) => {
  res.render('student_login', { error: null });
});

app.post('/student/login', async (req, res) => {
  const { admission_number, pin } = req.body;

  // Validate input parameters
  if (!admission_number || !pin) {
    return res.render('student_login', {
      error: 'Please provide both admission number and PIN',
    });
  }

  try {
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE admission_number = ? AND pin_code = ?',
      [admission_number, pin]
    );

    if (students.length > 0) {
      const token = jwt.sign(
        {
          studentId: students[0].id,
          admissionNumber: students[0].admission_number,
        },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      res.cookie('studentToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      res.redirect('/student/dashboard');
    } else {
      res.render('student_login', { error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Student login error:', error);
    res.render('student_login', { error: 'Login failed' });
  }
});

app.get('/student/dashboard', requireStudentAuth, async (req, res) => {
  try {
    // Add cache-busting headers
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Force fresh database query with explicit connection
    const connection = await pool.getConnection();
    try {
      const [students] = await connection.execute(
        'SELECT * FROM students WHERE id = ?',
        [req.studentId]
      );

      console.log(
        'STUDENT DASHBOARD - FRESH QUERY - Student ID:',
        req.studentId
      );
      console.log(
        'STUDENT DASHBOARD - FRESH QUERY - Found students:',
        students.length
      );

      if (students.length > 0) {
        console.log('STUDENT DASHBOARD - FRESH QUERY - Current student:', {
          id: students[0].id,
          name: students[0].full_name,
          admission: students[0].admission_number,
          admitted: students[0].admitted,
        });
        console.log('STUDENT DASHBOARD - RENDERING WITH STUDENT:', students[0]);
        res.render('student_dashboard', { student: students[0] });
      } else {
        console.log(
          'STUDENT DASHBOARD - No student found for ID:',
          req.studentId
        );
        res.redirect('/student/login');
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.redirect('/student/login');
  }
});

// Add Student Route
app.post('/admin/add-student', requireAdminAuth, async (req, res) => {
  try {
    console.log('Add student request received:', req.body);

    const { admission_number, full_name, phone_number } = req.body;

    // Validate input
    if (!admission_number || !full_name || !phone_number) {
      console.log('Validation failed: Missing required fields');
      return res.json({
        success: false,
        message: 'All fields are required',
      });
    }

    console.log(
      'Checking for existing student with admission number:',
      admission_number
    );

    // Check if admission number already exists
    const [existing] = await pool.execute(
      'SELECT id FROM students WHERE admission_number = ?',
      [admission_number]
    );

    if (existing.length > 0) {
      console.log(
        'Student already exists with admission number:',
        admission_number
      );
      return res.json({
        success: false,
        message: 'Admission number already exists',
      });
    }

    console.log('Inserting new student:', {
      admission_number,
      full_name,
      phone_number,
    });

    // Insert new student
    const [result] = await pool.execute(
      'INSERT INTO students (admission_number, full_name, phone_number, admitted) VALUES (?, ?, ?, 0)',
      [admission_number, full_name, phone_number]
    );

    console.log('Student inserted successfully. Insert ID:', result.insertId);

    res.json({
      success: true,
      message: 'Student added successfully',
    });
  } catch (error) {
    console.error('Add student error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });
    res.json({
      success: false,
      message: 'Error adding student: ' + error.message,
    });
  }
});

// Admit Individual Student Route
app.post('/admit/:id', requireAdminAuth, async (req, res) => {
  try {
    const studentId = req.params.id;

    // Get student details
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ? AND admitted = 0',
      [studentId]
    );

    if (students.length === 0) {
      return res.json({
        success: false,
        message: 'Student not found or already admitted',
      });
    }

    const student = students[0];
    const pin = generatePIN();

    // Update student as admitted and set PIN
    await pool.execute(
      'UPDATE students SET admitted = 1, pin_code = ? WHERE id = ?',
      [pin, studentId]
    );

    // Send SMS notification
    try {
      const { sendSMS } = require('./utils/sms');
      await sendSMS(
        student.phone_number,
        `Congratulations! You have been admitted to NSACOE. Your admission number is ${student.admission_number} and your PIN is ${pin}. visit https://admissions.nsacoe.edu.gh/student/login to download your admission documents.`
      );
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Continue even if SMS fails
    }

    res.json({
      success: true,
      message: `Student ${student.full_name} admitted successfully`,
    });
  } catch (error) {
    console.error('Admit student error:', error);
    res.json({
      success: false,
      message: 'Error admitting student',
    });
  }
});

// Bulk Admit All Pending Students Route
app.post('/admin/bulk-admit', requireAdminAuth, async (req, res) => {
  try {
    // Get all pending students
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE admitted = 0'
    );

    if (students.length === 0) {
      return res.json({
        success: false,
        message: 'No pending students to admit',
      });
    }

    let admittedCount = 0;
    const errors = [];

    for (const student of students) {
      try {
        const pin = generatePIN();

        // Update student as admitted
        await pool.execute(
          'UPDATE students SET admitted = 1, pin_code = ? WHERE id = ?',
          [pin, student.id]
        );

        // Send SMS notification
        try {
          const { sendSMS } = require('./utils/sms');
          await sendSMS(
            student.phone_number,
            `Congratulations! You have been admitted to NSACOE. Your admission number is ${student.admission_number} and your PIN is ${pin}. Please keep this information safe.`
          );
        } catch (smsError) {
          console.error(`SMS failed for ${student.full_name}:`, smsError);
          errors.push(`${student.full_name}: SMS failed`);
        }

        admittedCount++;
      } catch (error) {
        console.error(`Error admitting ${student.full_name}:`, error);
        errors.push(`${student.full_name}: ${error.message}`);
      }
    }

    let message = `Successfully admitted ${admittedCount} students`;
    if (errors.length > 0) {
      message += `. Errors: ${errors.join(', ')}`;
    }

    res.json({
      success: true,
      message: message,
    });
  } catch (error) {
    console.error('Bulk admit error:', error);
    res.json({
      success: false,
      message: 'Error admitting students',
    });
  }
});

// Document Routes
app.get('/documents/prospectus.pdf', (req, res) => {
  const filePath = path.join(
    __dirname,
    'public',
    'css',
    'documents',
    'Prospectus.pdf'
  );
  res.download(filePath, 'NSACOE-Prospectus.pdf');
});

app.get('/documents/acceptance-letter.pdf', (req, res) => {
  const filePath = path.join(
    __dirname,
    'public',
    'css',
    'documents',
    'Acceptance Letter.pdf'
  );
  res.download(filePath, 'NSACOE-Acceptance-Letter.pdf');
});

// Admission Letter Route (Dynamic)
app.get('/student/admission-letter', requireStudentAuth, async (req, res) => {
  try {
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.studentId]
    );

    if (students.length > 0) {
      res.render('admission_letter', { student: students[0] });
    } else {
      res.redirect('/student/login');
    }
  } catch (error) {
    console.error('Admission letter error:', error);
    res.redirect('/student/login');
  }
});

// Logout
app.post('/logout', (req, res) => {
  // Check which token exists to determine user type
  const hasAdminToken = req.cookies?.adminToken;
  const hasStudentToken = req.cookies?.studentToken;

  // Clear both tokens
  res.clearCookie('adminToken');
  res.clearCookie('studentToken');

  // Redirect based on user type
  if (hasStudentToken) {
    res.redirect('/student/login');
  } else if (hasAdminToken) {
    res.redirect('/admin/login');
  } else {
    res.redirect('/');
  }
});

// Database test route (for debugging)
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');

    // Get database information
    const [dbInfo] = await pool.execute('SELECT DATABASE() as current_db');
    const [version] = await pool.execute('SELECT VERSION() as mysql_version');

    res.json({
      success: true,
      message: 'Database connection successful',
      data: rows,
      database: dbInfo[0].current_db,
      mysqlVersion: version[0].mysql_version,
      connectionConfig: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        database: process.env.DB_NAME || 'admission_management',
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Check students table structure
app.get('/test-table', async (req, res) => {
  try {
    // Check if students table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'students'");

    if (tables.length === 0) {
      return res.json({
        success: false,
        message: 'Students table does not exist',
        tables: tables,
      });
    }

    // Get table structure
    const [columns] = await pool.execute('DESCRIBE students');

    // Get current student count
    const [count] = await pool.execute(
      'SELECT COUNT(*) as total FROM students'
    );

    res.json({
      success: true,
      message: 'Students table exists',
      tableStructure: columns,
      studentCount: count[0].total,
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Error checking table: ' + error.message,
      error: error.message,
    });
  }
});

// Get all students (for debugging)
app.get('/test-students', async (req, res) => {
  try {
    const [students] = await pool.execute(
      'SELECT * FROM students ORDER BY id DESC'
    );

    // Get database info
    const [dbInfo] = await pool.execute('SELECT DATABASE() as current_db');

    res.json({
      success: true,
      message: 'Current students in database',
      students: students,
      count: students.length,
      database: dbInfo[0].current_db,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Error fetching students: ' + error.message,
      error: error.message,
    });
  }
});

// Clear cache route
app.get('/clear-cache', (req, res) => {
  // Clear any potential caches
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  res.json({
    success: true,
    message: 'Cache headers set to prevent caching',
    timestamp: new Date().toISOString(),
  });
});

// Force refresh admin dashboard
app.get('/admin-refresh', requireAdminAuth, async (req, res) => {
  try {
    // Force fresh database query
    const connection = await pool.getConnection();
    try {
      const [students] = await connection.execute(
        'SELECT * FROM students ORDER BY created_at DESC LIMIT 100'
      );

      console.log('FORCE REFRESH - students count:', students.length);

      res.json({
        success: true,
        message: 'Fresh data loaded',
        students: students,
        count: students.length,
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.json({
      success: false,
      message: 'Error refreshing data',
      error: error.message,
    });
  }
});

// Force refresh student dashboard
app.get('/student-refresh', requireStudentAuth, async (req, res) => {
  try {
    // Force fresh database query
    const connection = await pool.getConnection();
    try {
      const [students] = await connection.execute(
        'SELECT * FROM students WHERE id = ?',
        [req.studentId]
      );

      console.log('STUDENT FORCE REFRESH - Student ID:', req.studentId);
      console.log('STUDENT FORCE REFRESH - Found students:', students.length);

      if (students.length > 0) {
        res.json({
          success: true,
          message: 'Fresh student data loaded',
          student: students[0],
          timestamp: new Date().toISOString(),
        });
      } else {
        res.json({
          success: false,
          message: 'Student not found',
          studentId: req.studentId,
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    res.json({
      success: false,
      message: 'Error refreshing student data',
      error: error.message,
    });
  }
});

// Clear student session and force re-login
app.get('/student-clear-session', (req, res) => {
  // Clear student token cookie
  res.clearCookie('studentToken');

  res.json({
    success: true,
    message: 'Student session cleared. Please login again.',
    timestamp: new Date().toISOString(),
  });
});

// Check current JWT token content
app.get('/check-token', (req, res) => {
  try {
    const token = req.cookies?.studentToken;

    if (!token) {
      return res.json({
        success: false,
        message: 'No student token found',
        timestamp: new Date().toISOString(),
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-jwt-secret'
    );

    res.json({
      success: true,
      message: 'Token decoded successfully',
      tokenData: decoded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Token decode error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Test student data for ID 56
app.get('/test-student-56', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const [students] = await connection.execute(
        'SELECT * FROM students WHERE id = 56'
      );

      res.json({
        success: true,
        message: 'Student data for ID 56',
        student: students[0] || null,
        count: students.length,
        timestamp: new Date().toISOString(),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.json({
      success: false,
      message: 'Error fetching student 56',
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
