Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   # 📚 QR-Based Library Management System  A dual-interface web application for Polangui Municipal Library to modernize visitor registration, check-in/out, book borrowing, and administrative reporting using QR codes.  **Technologies:**    - Backend: Node.js, Express, MongoDB (Mongoose)    - Frontend: React (Vite), Tailwind CSS    - QR Scanning: Webcam (html5-qrcode)    - Authentication: JWT + PIN    - Deployment: Render (backend) + local network (admin) or all on Render.  ---  ## 🚀 Features  ### Visitor Mobile System  - Register with personal info (name, address, DOB, gender, course, profession, purpose)  - Generate a unique QR visitor pass and reference number  - Edit profile (purpose editable, other fields retained)  - Check‑in/out by scanning QR code at admin desk  - Search and borrow books (age‑based recommendations, most borrowed first)  - Borrow request with phone/email and return date (1–3 days) – pending until admin confirms  - View borrowing history with status (Active, Due Today, Overdue, Returned)  ### Admin Dashboard  - Secure login (username + 4‑digit PIN)  - Real‑time stats (Today’s visitors, Checked in, Checked out, Active borrows)  - Webcam QR scanner for visitor check‑in/out (auto toggle)  - Assisted check‑in by reference number (for non‑smartphone users)  - Active visitors list  - Borrowing management:    - **Confirm Borrow QR** – scan visitor’s borrow QR to activate loan    - **Mark Returned** – with optional damage/issues note    - **Not Returned** – mark as lost (no copy increase)    - **Send Reminder** – simulate SMS/email reminder  - Demographics charts (monthly bar chart, today’s pie chart by age group)  - Progress Data – editable accomplishment report (visitor demographics + most borrowed books) with PDF/DOC export  - Visitor Mobile Pass helper (QR code for mobile site + staff assistance mode)  - Staff logs (placeholder)  ---  ## 📦 Prerequisites  - Node.js (v18 or later) – [Download](https://nodejs.org)  - MongoDB Atlas account (free tier) – [Sign up](https://www.mongodb.com/cloud/atlas)  - Git (optional, for cloning)  - Webcam (for QR scanning in admin dashboard)  ---  ## 🛠️ Installation & Setup  ### 1. Clone the repository  ```bash  git clone https://github.com/YOUR_USERNAME/library-qr-system.git  cd library-qr-system   `

### 2\. Backend setup

bash

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   cd backend  npm install   `

Create a .env file in the backend/ folder:

env

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   PORT=5000  JWT_SECRET=your_super_secret_key  MONGO_URI=mongodb+srv://:@cluster.mongodb.net/library_db?retryWrites=true&w=majority   `

*   Replace  and  with your MongoDB Atlas credentials.
    
*   The database library\_db will be created automatically.
    

### 3\. Frontend setup

bash

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   cd ../frontend  npm install   `

Create a .env file in the frontend/ folder:

env

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   VITE_API_URL=http://localhost:5000/api   `

If you deploy the backend to Render, change this to your Render backend URL.

### 4\. Seed initial data (optional)

You can add books manually via MongoDB Atlas or run a seed script (not included). The system will work with empty collections, but you won’t see recommendations or most borrowed books.

### 5\. Run the application

#### Backend (from backend/ folder)

bash

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   node server.js  # or for auto‑restart during development:  npx nodemon server.js   `

#### Frontend (from frontend/ folder)

bash

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   npm run dev   `

The frontend will be available at http://localhost:5173.

📱 Usage
--------

1.  **Access the system chooser** – open http://localhost:5173/
    
2.  **Visitor Mobile System** – click "Open Mobile Demo" → register → get QR pass → check‑in/out at admin desk.
    
3.  **Admin System** – click "Open Admin Demo" → login with default credentials (first time, register a staff account) or use demo: librarian / 1234.
    

🧪 Testing
----------

*   Register a visitor on the mobile site.
    
*   In the admin dashboard, use the QR scanner (webcam) to check the visitor in/out.
    
*   Borrow a book from the mobile site, then confirm the loan in admin → Borrowing tab → "Confirm Borrow QR".
    
*   Return the book using "Mark Returned" button with optional issues.
    
*   View reports in "Progress Data" and export as DOC/PDF.
    

☁️ Deployment on Render
-----------------------

### Backend (Node.js service)

1.  Push your code to GitHub.
    
2.  On Render, create a new **Web Service** → connect your repo → set:
    
    *   Build command: cd backend && npm install
        
    *   Start command: cd backend && node server.js
        
    *   Environment variables: MONGO\_URI, JWT\_SECRET, PORT.
        
3.  Render will provide a URL (e.g., https://library-backend.onrender.com).
    

### Frontend (Static site)

1.  In the frontend folder, create a production build: npm run build
    
2.  On Render, create a **Static Site** → connect your repo → set:
    
    *   Build command: cd frontend && npm install && npm run build
        
    *   Publish directory: frontend/dist
        
    *   Environment variable: VITE\_API\_URL = your backend Render URL.
        
3.  The mobile site will be available at the static site URL.
    

> **Note:** For local library deployment, you can run the backend on a library computer and access it via local IP (e.g., http://192.168.x.x:5000). Update VITE\_API\_URL accordingly.

👥 Team
-------

*   Christine Jade P. Ondis
    
*   Kristine O. Villanueva
    
*   Magdaline S. Infante
    

BS Information System – Bicol University Polangui

📄 License
----------

This project is for academic purposes only.
