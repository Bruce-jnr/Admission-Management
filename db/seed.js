const { pool } = require('./connection');

async function seedDatabase() {
  try {
    console.log('Seeding database with sample data...');

    // Sample students data
    const sampleStudents = [
      {
        admission_number: 'ADM001',
        full_name: 'John Doe',
        phone_number: '+1234567890',
      },
      {
        admission_number: 'ADM002',
        full_name: 'Jane Smith',
        phone_number: '+1234567891',
      },
      {
        admission_number: 'ADM003',
        full_name: 'Michael Johnson',
        phone_number: '+1234567892',
      },
      {
        admission_number: 'ADM004',
        full_name: 'Sarah Wilson',
        phone_number: '+1234567893',
      },
      {
        admission_number: 'ADM005',
        full_name: 'David Brown',
        phone_number: '+1234567894',
      },
    ];

    // Insert sample students
    for (const student of sampleStudents) {
      try {
        await pool.execute(
          'INSERT IGNORE INTO students (admission_number, full_name, phone_number) VALUES (?, ?, ?)',
          [student.admission_number, student.full_name, student.phone_number]
        );
        console.log(`✓ Added student: ${student.full_name}`);
      } catch (error) {
        console.log(`⚠ Student ${student.full_name} might already exist`);
      }
    }

    console.log('Database seeding completed successfully!');
    console.log('\nSample login credentials:');
    console.log('Admin Password: admin123');
    console.log(
      'Student Login: Use any admission number with PIN sent via SMS'
    );
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
