# 🚀 Prompt for Cursor: Admission Management System

### 🧠 Project Overview

Build a full-stack web app using **HTML**, **Bootstrap**, **JavaScript (frontend)**, and **Node.js + Express.js + MySQL (backend)** called **Admission Management System**.

---

## 🎯 Features

- Display a list of students with:

  - Admission Number
  - Full Name
  - Telephone Number
  - Action Button: **Admit**

- When the **Admit** button is clicked:

  1. Save the student’s status as **“Admitted”** in the database.
  2. Generate a personalized **Admission Letter (HTML page)** that includes the student’s Admission Number and Full Name.
  3. Send an **SMS** (via Arkesel or Twilio API) to the student’s phone number with a link to download their admission documents.

---

## 📱 SMS Message Format

```
Congratulations [Full Name]! You have been admitted.
Visit [baseURL]/download to get your admission letter and prospectus.
```

---

## 🌐 Download Page

- The link in the SMS opens `/download`.
- The page should ask for the student’s **Admission Number**.
- If the Admission Number exists:

  - Display their personalized Admission Letter.
  - Show two buttons:

    1. **Download Admission Prospectus** (PDF)
    2. **Download Acceptance Letter** (PDF)

---

## 🧩 Backend Requirements

- Use **Express.js** for routing:

  - `/` → Homepage showing student list (from MySQL)
  - `/admit/:id` → Marks a student as admitted and sends SMS
  - `/download` → Validates admission number and shows details

- Connect to **MySQL** using the following table schema:

```sql
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admission_number VARCHAR(20),
  full_name VARCHAR(100),
  phone_number VARCHAR(20),
  admitted BOOLEAN DEFAULT 0
);
```

- Optionally, create a `settings` table to store file URLs for:

  - Admission Prospectus
  - Acceptance Letter

---

## 💻 Frontend Requirements

- Use **Bootstrap 5** for styling and layout.
- Use **Fetch API** or **Axios** for AJAX requests.
- Create a clean, responsive dashboard UI.

---

## 📤 SMS Integration

- Use **Arkesel** or **Twilio** API to send SMS.
- Store credentials securely in a `.env` file.
- Include an example request for sending an SMS in Node.js.

---

## 🧱 Admission Letter Page

- Admission letter should be dynamically rendered using **EJS** or **Handlebars** templates.
- Should display:

  - Student’s Name
  - Admission Number
  - Congratulations text or admission details.

---

## 🗂️ Suggested Folder Structure

```
admission-app/
├── server.js
├── package.json
├── .env
├── public/
│   ├── css/
│   ├── js/
│   └── uploads/
├── views/
│   ├── index.ejs
│   ├── admission_letter.ejs
│   └── download.ejs
└── db/
    └── connection.js
```

---

## ⚙️ Setup Instructions

```bash
npm install
npm start
```

- The app should run locally on **port 3000**.

---

## 📋 Deliverables

Cursor should generate the **full working code**, including:

- Express routes
- MySQL connection and queries
- HTML/Bootstrap templates
- `.env` file format example
- Example SMS sending code (mock or Arkesel API)
- Setup and run instructions

---

In all there should be an admin and student route. there should be password protection on the admin and when the admit is clicked there should be a 6 digit pin that will be send along to the admitted student so they login in with with admission number and the passpord to assess the documents.

ARKSEL_APIKEY=SWhWdWtDdVZ1emZyWk9pSWxNYks
ARKSEL_SENDER_ID=NSACOE

DB_HOST= localhost
DB_USER=root
DB_PASSWORD=Cincinnatigirl@12
DB_NAME=admission_management
