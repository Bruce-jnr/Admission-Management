const path = require('path');
const dotenv = require('dotenv');

// Load .env from the same directory as this config.js file
dotenv.config({
  path: path.join(__dirname, '.env'),
});

// Required environment variables
const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'PIN_ENCRYPTION_KEY',
  'SUPER_ADMIN_PASSWORD',
];

// Validate required environment variables
function validateConfig() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  // JWT secret validation
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  // PIN encryption key validation
  if (process.env.PIN_ENCRYPTION_KEY.length < 32) {
    throw new Error('PIN_ENCRYPTION_KEY must contain at least 32 characters');
  }

  // Super admin password validation
  if (process.env.SUPER_ADMIN_PASSWORD.length < 8) {
    throw new Error('SUPER_ADMIN_PASSWORD must contain at least 8 characters');
  }
}

// Application configuration
const config = {
  // Server
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',

  jwtSecret: process.env.JWT_SECRET,

  pinEncryptionSecret: process.env.PIN_ENCRYPTION_KEY,

  // Super administrator
  superAdminUsername: (process.env.SUPER_ADMIN_USERNAME || 'superadmin')
    .trim()
    .toLowerCase(),

  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD,

  // Database
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },

  // Files
  documentsDirectory: path.join(__dirname, 'documents'),

  // Admission configuration
  admissionLetter: Object.freeze({
    academicYear: '2026/2027',
    reportingDate: '2026-10-19',
    reportingTime: '5:00pm',
    feeDeadline: '2026-10-18',
  }),
};

module.exports = {
  ...config,
  validateConfig,
};
