# 📚 QR-Based Library Management System

A dual-interface web application for **Polangui Municipal Library** to modernize visitor registration, check-in/out, book borrowing, and administrative reporting using QR codes.

---

## 🛠️ Technologies

* **Backend:** Node.js, Express, MongoDB (Mongoose)
* **Frontend:** React (Vite), Tailwind CSS
* **QR Scanning:** html5-qrcode (Webcam)
* **Authentication:** JWT + PIN
* **Deployment:** Render (backend) + local network or cloud deployment

---

## 🚀 Features

### 📱 Visitor Mobile System

* Register visitor information (name, address, DOB, gender, course, profession, purpose)
* Generate QR visitor pass + reference number
* Edit profile (purpose editable)
* Check-in / Check-out via QR scan
* Search and borrow books (recommendation-based)
* Borrow request (1–3 days return period)
* View borrowing history:

  * Active
  * Due Today
  * Overdue
  * Returned

---

### 🖥️ Admin Dashboard

* Secure login (username + 4-digit PIN)

* Real-time statistics:
  * Today’s visitors
  * Currently in library
  * Checked out
  * Active borrows

* QR Scanner (webcam-based, auto toggle)

* Manual check-in via reference number

* Active visitors list

* **Manage Books** – full CRUD (add, edit, delete) with search and category filter; deletion prevented if book has active loans

* **Borrowing Management**:
  * Confirm Borrow QR (activate pending loans)
  * Mark Returned (with optional damage/issues note)
  * Mark Not Returned (lost item handling)
  * Send Reminder (real email using Nodemailer)

* **Reports & Analytics**:
  * Visitor demographics charts (monthly bar, today’s pie)
  * Monthly Progress Data (editable report)
  * Export reports as PDF or DOC

* Visitor Mobile Pass helper

* Staff logs (placeholder module)

* **PIN protection** for “Borrowing & Returning” and “Manage Books” (asked every time)

---

#### 📚 Borrowing Management

* Confirm Borrow QR
* Mark Returned (with optional damage notes)
* Mark Not Returned (lost item handling)
* Send Reminder (SMS/email simulation)

---

#### 📊 Reports & Analytics

* Visitor demographics charts

* Monthly Progress Data (editable report)

* Export reports as:

  * PDF
  * DOC

* Visitor Mobile Pass helper

* Staff logs (placeholder module)

---

## 📦 Prerequisites

* Node.js (v18 or later) → https://nodejs.org
* MongoDB Atlas → https://www.mongodb.com/cloud/atlas
* Git (optional)
* Webcam (for QR scanning)
* Gmail account (for email reminders) – you will need to generate an **App Password**

---

## 🛠️ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/library-qr-system.git
cd library-qr-system
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

#### 📦 Backend Dependencies

* express
* mongoose
* cors
* dotenv
* bcryptjs
* jsonwebtoken
* qrcode
* nodemailer
* date-fns
* nodemon (dev)

---

#### 🔐 Environment Variables (backend/.env)

```env
PORT=5000
JWT_SECRET=your_super_secret_key
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/library_db?retryWrites=true&w=majority
```

Replace `<username>` and `<password>` with your MongoDB Atlas credentials.

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

#### 📦 Frontend Dependencies

* react
* react-dom
* react-router-dom
* lucide-react
* qrcode
* recharts
* date-fns
* sonner
* html5-qrcode
* html2pdf.js
* file-saver
* tailwindcss
* postcss
* autoprefixer
* vite

---

#### 🌐 Environment Variables (frontend/.env)

```env
VITE_API_URL=http://localhost:5000/api
```

If deployed, replace with your Render backend URL.

---

### 4. Run the Application

#### ▶ Backend

```bash
cd backend
node server.js
```

or

```bash
npx nodemon server.js
```

---

#### ▶ Frontend

```bash
cd frontend
npm run dev
```

---

Open in browser:

```
http://localhost:5173
```

---

## 📱 Usage Flow

1. Open system → `http://localhost:5173`
2. Choose:

   * Visitor Mobile System
   * Admin Dashboard
3. Register visitor → generate QR
4. Scan QR in admin → check-in/out
5. Borrow books → confirm in admin
6. Return books → add notes if needed
7. View reports → export PDF/DOC

---

## 🧪 Testing

* Register visitor and generate QR
* Scan QR in admin dashboard
* Borrow book and confirm loan
* Return book with/without issues
* Click “Send Reminder” – an email will be sent to the borrower (if email configured)
* Add, edit, or delete a book (Manage Books)
* Check Progress Data report & Export PDF / DOC

---

## ☁️ Deployment (Render)

### Backend

* Build:

```bash
cd backend && npm install
```

* Start:

```bash
node server.js
```

* Add env variables:

  * MONGO_URI
  * JWT_SECRET
  * PORT

---

### Frontend

```bash
cd frontend && npm install && npm run build
```

* Publish folder:

```
frontend/dist
```

* Environment:

```
VITE_API_URL = your backend URL
```

---

## 👥 Team

* Christine Jade P. Ondis
* Kristine O. Villanueva
* Magdaline S. Infante

---

## 📄 License

For academic purposes only.
