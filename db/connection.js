const mysql = require('mysql2/promise');
const { database, superAdminPassword, superAdminUsername } = require('../config');
const { hashPassword } = require('../services/password');

const pool = mysql.createPool({
  ...database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumn(connection, table, column, definition) {
  if (!(await columnExists(connection, table, column))) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );
  }
}

async function initializeDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admission_number VARCHAR(20) NOT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        admitted BOOLEAN NOT NULL DEFAULT 0,
        admitted_at DATETIME NULL,
        pin_code VARCHAR(6),
        pin_hash VARCHAR(255),
        pin_ciphertext TEXT NULL,
        sms_status VARCHAR(20) NOT NULL DEFAULT 'not_sent',
        sms_sent_at DATETIME NULL,
        sms_error TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await addColumn(connection, 'students', 'pin_hash', 'VARCHAR(255) NULL AFTER pin_code');
    await addColumn(connection, 'students', 'admitted_at', 'DATETIME NULL AFTER admitted');
    await addColumn(connection, 'students', 'pin_ciphertext', 'TEXT NULL AFTER pin_hash');
    await addColumn(connection, 'students', 'sms_status', "VARCHAR(20) NOT NULL DEFAULT 'not_sent' AFTER pin_hash");
    await addColumn(connection, 'students', 'sms_sent_at', 'DATETIME NULL AFTER sms_status');
    await addColumn(connection, 'students', 'sms_error', 'TEXT NULL AFTER sms_sent_at');
    await connection.execute(
      'UPDATE students SET admitted_at = created_at WHERE admitted = 1 AND admitted_at IS NULL',
    );

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
        active BOOLEAN NOT NULL DEFAULT 1,
        token_version INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await addColumn(
      connection,
      'admin_users',
      'token_version',
      'INT NOT NULL DEFAULT 0 AFTER active',
    );

    const [superAdmins] = await connection.execute(
      "SELECT id FROM admin_users WHERE role = 'super_admin' LIMIT 1"
    );
    if (!superAdmins.length) {
      await connection.execute(
        `INSERT INTO admin_users (username, full_name, password_hash, role)
         VALUES (?, 'Super Administrator', ?, 'super_admin')`,
        [superAdminUsername, await hashPassword(superAdminPassword)]
      );
      console.log(`Created initial super admin account: ${superAdminUsername}`);
    }
  } finally {
    connection.release();
  }
}

async function closeDatabase() {
  await pool.end();
}

module.exports = { pool, initializeDatabase, closeDatabase };
