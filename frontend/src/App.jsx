import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileLayout from './components/MobileLayout';
import SystemChooser from './pages/SystemChooser';
import Landing from './pages/Landing';
import CheckInForm from './pages/CheckInForm';
import QRPass from './pages/QRPass';
import VisitorHome from './pages/VisitorHome';
import BorrowBooks from './pages/BorrowBooks';
import ConfirmBorrow from './pages/ConfirmBorrow';
import BorrowSuccess from './pages/BorrowSuccess';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Borrowing from './pages/Borrowing';
import ProgressData from './pages/ProgressData';
import VisitorMobilePass from './pages/VisitorMobilePass';
import ManageBooks from './pages/ManageBooks';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  // Detect if running on Render (not localhost)
  const isDeployed = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1');

  return (
    <BrowserRouter>
      <Routes>
        {isDeployed ? (
          // On Render: mobile site at root, no system chooser
          <Route path="/" element={<MobileLayout />}>
            <Route index element={<Landing />} />
            <Route path="checkin" element={<CheckInForm />} />
            <Route path="qr-pass" element={<QRPass />} />
            <Route path="home" element={<VisitorHome />} />
            <Route path="borrow" element={<BorrowBooks />} />
            <Route path="confirm-borrow" element={<ConfirmBorrow />} />
            <Route path="borrow-success" element={<BorrowSuccess />} />
          </Route>
        ) : (
          // Local development: system chooser at root
          <Route path="/" element={<SystemChooser />} />
        )}

        {/* Mobile routes (always available under /mobile for both envs, but on Render root already handles them) */}
        {!isDeployed && (
          <Route path="/mobile" element={<MobileLayout />}>
            <Route index element={<Landing />} />
            <Route path="checkin" element={<CheckInForm />} />
            <Route path="qr-pass" element={<QRPass />} />
            <Route path="home" element={<VisitorHome />} />
            <Route path="borrow" element={<BorrowBooks />} />
            <Route path="confirm-borrow" element={<ConfirmBorrow />} />
            <Route path="borrow-success" element={<BorrowSuccess />} />
          </Route>
        )}

        {/* Admin routes (available everywhere, but on Render they will still work if you navigate to /admin) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="borrowing" element={<ProtectedRoute><Borrowing /></ProtectedRoute>} />
          <Route path="progress" element={<ProtectedRoute><ProgressData /></ProtectedRoute>} />
          <Route path="visitor-pass" element={<ProtectedRoute><VisitorMobilePass /></ProtectedRoute>} />
          <Route path="books" element={<ProtectedRoute><ManageBooks /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;