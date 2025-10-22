# 🚀 Admission Management System - Setup Guide

## 📋 Prerequisites

Before setting up the application, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/)
- **Git** (optional) - [Download here](https://git-scm.com/)

## 🛠️ Installation Steps

### 1. Clone or Download the Project

```bash
# If using Git
git clone <repository-url>
cd admission-management

# Or download and extract the ZIP file
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

#### Create MySQL Database

1. Open MySQL command line or MySQL Workbench
2. Run the following SQL command:

```sql
CREATE DATABASE admission_management;
```

#### Configure Environment Variables

1. Create a `.env` file in the root directory
2. Copy the following content and update with your database credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=admission_management

# SMS Configuration (Arkesel)
ARKSEL_APIKEY=your_arkesel_api_key_here
ARKSEL_SENDER_ID=your_sender_id

# Application Configuration
SESSION_SECRET=your-secret-key-here
ADMIN_PASSWORD=admin123
PORT=3000
```

### 4. Initialize Database

```bash
# The database tables will be created automatically when you start the server
# Optionally, you can seed the database with sample data:
node db/seed.js
```

### 5. Start the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Or production mode
npm start
```

### 6. Access the Application

Open your browser and navigate to:

- **Admin Portal**: http://localhost:3000/admin/login
- **Student Portal**: http://localhost:3000/student/login

## 🔐 Default Credentials

### Admin Login

- **Password**: `admin123` (change this in production!)

### Student Login

- Use any admission number from the seeded data
- PIN will be sent via SMS when a student is admitted

## 📱 SMS Configuration

The application uses Arkesel SMS service. The API credentials are already configured in the `.env` file:

- **API Key**: `SWhWdWtDdVZ1emZyWk9pSWxNYks`
- **Sender ID**: `NSACOE`

### Testing SMS (Optional)

If you want to test SMS functionality without using real phone numbers, you can modify the `utils/sms.js` file to log messages instead of sending them.

## 🗂️ Project Structure

```
admission-management/
├── server.js                 # Main application file
├── package.json             # Dependencies and scripts
├── .env                     # Environment variables (create this)
├── db/
│   ├── connection.js        # Database connection
│   └── seed.js             # Sample data seeder
├── utils/
│   ├── sms.js              # SMS service integration
│   └── pdfGenerator.js    # PDF generation utility
├── views/                  # EJS templates
│   ├── admin_login.ejs
│   ├── admin_dashboard.ejs
│   ├── student_login.ejs
│   ├── student_dashboard.ejs
│   └── admission_letter.ejs
└── public/                 # Static files
    └── css/
        └── style.css
```

## 🚀 Features Overview

### Admin Features

- **Login**: Secure admin authentication
- **Student Management**: View all students
- **Add Students**: Add new students to the system
- **Admit Students**: Mark students as admitted and send SMS
- **Dashboard**: Overview of all students and their status

### Student Features

- **Login**: Access using admission number and PIN
- **View Admission Letter**: Personalized admission letter
- **Download Documents**: PDF downloads for prospectus and acceptance letter
- **Dashboard**: Student-specific information and actions

### SMS Integration

- **Automatic SMS**: Sent when student is admitted
- **PIN Generation**: 6-digit PIN for student authentication
- **Personalized Messages**: Custom messages with student details

### PDF Generation

- **Admission Letter**: Personalized HTML letter
- **Prospectus**: Academic program information
- **Acceptance Letter**: Official acceptance document

## 🔧 Configuration Options

### Database Settings

Update the database connection in `.env`:

```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=admission_management
```

### SMS Settings

To use a different SMS provider, modify `utils/sms.js`:

- Update the API endpoint
- Modify the request format
- Update authentication headers

### Application Settings

```env
PORT=3000                    # Server port
SESSION_SECRET=your-secret   # Session encryption key
ADMIN_PASSWORD=admin123      # Admin login password
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **SMS Not Sending**

   - Check Arkesel API credentials
   - Verify phone number format
   - Check network connectivity

3. **PDF Generation Error**

   - Ensure Puppeteer dependencies are installed
   - Check available disk space
   - Verify Node.js version compatibility

4. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing processes using the port

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

## 📞 Support

For technical support or questions:

- Check the console logs for error messages
- Verify all environment variables are set correctly
- Ensure all dependencies are installed
- Check database connectivity

## 🔒 Security Notes

### Production Deployment

1. **Change default passwords**
2. **Use strong session secrets**
3. **Enable HTTPS**
4. **Set up proper database permissions**
5. **Configure firewall rules**
6. **Regular security updates**

### Environment Variables

Never commit `.env` files to version control. Always use environment-specific configurations.

## 🎯 Next Steps

After successful setup:

1. **Test the application** with sample data
2. **Customize the templates** to match your institution's branding
3. **Configure SMS settings** for your SMS provider
4. **Set up production database** with proper security
5. **Deploy to your preferred hosting platform**

---

**Happy coding! 🎓**
