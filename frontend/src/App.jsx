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
import AdminLayout from './components/AdminLayout';
import ManageBooks from './pages/ManageBooks';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root - System Chooser */}
        <Route path="/" element={<SystemChooser />} />

        {/* Mobile routes */}
        <Route path="/mobile" element={<MobileLayout />}>
          <Route index element={<Landing />} />
          <Route path="checkin" element={<CheckInForm />} />
          <Route path="qr-pass" element={<QRPass />} />
          <Route path="home" element={<VisitorHome />} />
          <Route path="borrow" element={<BorrowBooks />} />
          <Route path="confirm-borrow" element={<ConfirmBorrow />} />
          <Route path="borrow-success" element={<BorrowSuccess />} />
        </Route>

        {/* Admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin pages with layout (no ProtectedRoute) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="borrowing" element={<Borrowing />} />
          <Route path="books" element={<ManageBooks />} />
          <Route path="progress" element={<ProgressData />} />
          <Route path="visitor-pass" element={<VisitorMobilePass />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;