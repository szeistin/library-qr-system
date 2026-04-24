import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  const isRenderDeployed = window.location.hostname.includes('onrender.com');

  return (
    <BrowserRouter>
      <Routes>
        {isRenderDeployed ? (
          // On Render: redirect root to /mobile
          <Route path="/" element={<Navigate to="/mobile" replace />} />
        ) : (
          // Local: system chooser at root
          <Route path="/" element={<SystemChooser />} />
        )}

        {/* Mobile routes always under /mobile */}
        <Route path="/mobile" element={<MobileLayout />}>
          <Route index element={<Landing />} />
          <Route path="checkin" element={<CheckInForm />} />
          <Route path="qr-pass" element={<QRPass />} />
          <Route path="home" element={<VisitorHome />} />
          <Route path="borrow" element={<BorrowBooks />} />
          <Route path="confirm-borrow" element={<ConfirmBorrow />} />
          <Route path="borrow-success" element={<BorrowSuccess />} />
        </Route>

        {/* Admin routes (unchanged) */}
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