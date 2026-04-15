# 📚 QR-Based Library Management System

A dual-interface web application for **Polangui Municipal Library** to modernize visitor registration, check-in/out, book borrowing, and administrative reporting using QR codes.

---

## 🛠️ Technologies

* **Backend:** Node.js, Express, MongoDB (Mongoose)
* **Frontend:** React (Vite), Tailwind CSS
* **QR Scanning:** html5-qrcode (Webcam)
* **Authentication:** JWT + PIN
* **Deployment:** Render (backend) + local network or full Render deployment

---

## 🚀 Features

### 📱 Visitor Mobile System

* Register with personal info (name, address, DOB, gender, course, profession, purpose)
* Generate QR visitor pass + reference number
* Edit profile (purpose editable)
* Check-in/out via QR scan
* Search & borrow books (age-based recommendations)
* Borrow request (1–3 days return)
* View borrowing history:

  * Active
  * Due Today
  * Overdue
  * Returned

---

### 🖥️ Admin Dashboard

* Secure login (username + 4-digit PIN)
* Real-time stats:

  * Today’s visitors
  * Checked in/out
  * Active borrows
* QR Scanner (webcam) for check-in/out
* Manual check-in (reference number)
* Active visitors list

#### 📚 Borrowing Management

* Confirm Borrow QR
* Mark Returned (with damage notes)
* Mark Not Returned (lost)
* Send Reminder (SMS/email simulation)

#### 📊 Reports

* Demographics charts
* Progress Data (editable report)
* Export to **PDF / DOC**

#### 🔧 Utilities

* Visitor Mobile Pass helper
* Staff logs (placeholder)

---

## 📦 Prerequisites

* Node.js (v18+) → https://nodejs.org
* MongoDB Atlas → https://www.mongodb.com/cloud/atlas
* Git (optional)
* Webcam (for QR scanning)

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

Create `.env` file inside **backend/**:

```env
PORT=5000
JWT_SECRET=your_super_secret_key
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/library_db?retryWrites=true&w=majority
```

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` inside **frontend/**:

```env
VITE_API_URL=http://localhost:5000/api
```

---

### 4. Run the Application

#### Backend

```bash
node server.js
# or
npx nodemon server.js
```

#### Frontend

```bash
npm run dev
```

Open:

```
http://localhost:5173
```

---

## 📱 Usage

1. Open system → `http://localhost:5173`
2. Choose:

   * **Mobile Demo** (Visitor)
   * **Admin Demo**

Default admin (example):

```
username: librarian
PIN: 1234
```

---

## 🧪 Testing

* Register visitor → get QR
* Scan QR in admin → check-in/out
* Borrow book → confirm in admin
* Return book → add issue (optional)
* View Progress Data → export PDF/DOC

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

* Add env:

  * `MONGO_URI`
  * `JWT_SECRET`
  * `PORT`

---

### Frontend

```bash
cd frontend && npm install && npm run build
```

* Publish folder:

```
frontend/dist
```

* Env:

```
VITE_API_URL=https://your-backend-url
```

---

## 👥 Team

* Christine Jade P. Ondis
* Kristine O. Villanueva
* Magdaline S. Infante

**BS Information System – Bicol University Polangui**

---

## 📄 License

For academic purposes only.
