import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookMarked, BarChart3, Smartphone,
  LogOut, Bell, Menu, X, ChevronRight, Library, Shield
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { toast, Toaster } from "sonner";
import logo from "../assets/logo.png";

const API_URL = import.meta.env.VITE_API_URL;
const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/borrowing", label: "Borrowing & Returning", icon: BookMarked },
  { path: "/admin/books", label: "Manage Books", icon: Library },
  { path: "/admin/progress", label: "Progress Data", icon: BarChart3 },
  { path: "/admin/visitor-pass", label: "Visitor Mobile Pass", icon: Smartphone },
];
const PROTECTED_PATHS = ["/admin/borrowing", "/admin/books"];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [staff, setStaff] = useState(null);
  const [alerts, setAlerts] = useState({ overdue: [], dueToday: [], dueTomorrow: [] });
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [pinModal, setPinModal] = useState({ open: false, targetPath: null });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const token = localStorage.getItem("token");

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/loans/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const loans = await res.json();
        const today = new Date().toISOString().split("T")[0];
        const overdue = loans.filter(l => isPast(new Date(l.due_date)) && l.status !== "returned");
        const dueToday = loans.filter(l => isToday(new Date(l.due_date)) && l.status === "borrowed");
        const dueTomorrow = loans.filter(l => isTomorrow(new Date(l.due_date)) && l.status === "borrowed");
        setAlerts({ overdue, dueToday, dueTomorrow });
        setTotalAlerts(overdue.length + dueToday.length + dueTomorrow.length);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    const storedStaff = localStorage.getItem("staff");
    if (storedStaff) setStaff(JSON.parse(storedStaff));
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [token, navigate]);

  const handleSendReminder = async (loan) => {
    try {
      const res = await fetch(`${API_URL}/loans/${loan._id}/reminder`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(`Reminder sent to ${loan.email}`);
      fetchAlerts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("staff");
    navigate("/admin/login");
  };

  const handleNavClick = (path) => {
    if (PROTECTED_PATHS.includes(path)) {
      // Always ask for PIN, no caching
      setPinModal({ open: true, targetPath: path });
    } else {
      navigate(path);
      setSidebarOpen(false);
    }
  };

  const verifyPin = async () => {
    if (!pinInput) return;
    try {
      const res = await fetch(`${API_URL}/staff/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPinModal({ open: false, targetPath: null });
      setPinInput("");
      setPinError("");
      navigate(pinModal.targetPath);
      setSidebarOpen(false);
    } catch (err) {
      setPinError(err.message);
    }
  };

  const currentNav = NAV_ITEMS.find(n => location.pathname === n.path);

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex">
      <Toaster position="top-right" />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#1B3A6B] flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9 rounded-xl object-cover" />
            <div>
              <p className="text-white text-xs font-bold leading-tight">Polangui Municipal</p>
              <p className="text-[#C9A227] text-xs font-bold">LIBRARY</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/50 lg:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 bg-white/10 rounded-lg p-2.5">
            <p className="text-blue-200 text-xs">Logged in as</p>
            <p className="text-white text-sm font-semibold">{staff?.username || 'Staff'}</p>
            <p className="text-blue-300 text-xs">{staff?.position}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleNavClick(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? 'bg-white text-[#1B3A6B] font-bold shadow-md'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {active && <ChevronRight className="w-3 h-3" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-[#1B3A6B] font-bold text-sm">{currentNav?.label || 'Admin'}</h1>
            <p className="text-gray-400 text-xs">{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} • QR-Based Library Management System</p>
          </div>
          <button
            onClick={() => setShowNotificationPanel(true)}
            className="relative p-2 rounded-xl hover:bg-gray-100 transition"
            title="View due date alerts"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {totalAlerts}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Notification Panel */}
      {showNotificationPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-sm h-full shadow-xl flex flex-col">
            <div className="bg-red-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2"><Bell className="w-5 h-5" /> Due Date Alerts ({totalAlerts})</div>
              <button onClick={() => setShowNotificationPanel(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {alerts.overdue.length > 0 && <div><div className="bg-red-50 p-2 font-bold text-red-700 rounded-t">🚨 OVERDUE</div>{alerts.overdue.map(loan => (
                <div key={loan._id} className="border-b py-2">
                  <div className="font-medium">{loan.book.title}</div>
                  <div className="text-sm">{loan.visitor.name} | {loan.email}</div>
                  <div className="text-xs text-gray-500">Due: {format(new Date(loan.due_date), 'PPP')}</div>
                  {!loan.reminder_sent && <button onClick={() => handleSendReminder(loan)} className="mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded">Remind</button>}
                </div>
              ))}</div>}
              {alerts.dueToday.length > 0 && <div><div className="bg-orange-50 p-2 font-bold text-orange-700 rounded-t">⏰ DUE TODAY</div>{alerts.dueToday.map(loan => (
                <div key={loan._id} className="border-b py-2">
                  <div className="font-medium">{loan.book.title}</div>
                  <div className="text-sm">{loan.visitor.name} | {loan.email}</div>
                  <div className="text-xs text-gray-500">Due: {format(new Date(loan.due_date), 'PPP')}</div>
                  {!loan.reminder_sent && <button onClick={() => handleSendReminder(loan)} className="mt-1 bg-orange-500 text-white text-xs px-2 py-1 rounded">Remind</button>}
                </div>
              ))}</div>}
              {alerts.dueTomorrow.length > 0 && <div><div className="bg-yellow-50 p-2 font-bold text-yellow-700 rounded-t">📅 DUE TOMORROW</div>{alerts.dueTomorrow.map(loan => (
                <div key={loan._id} className="border-b py-2">
                  <div className="font-medium">{loan.book.title}</div>
                  <div className="text-sm">{loan.visitor.name} | {loan.email}</div>
                  <div className="text-xs text-gray-500">Due: {format(new Date(loan.due_date), 'PPP')}</div>
                  {!loan.reminder_sent && <button onClick={() => handleSendReminder(loan)} className="mt-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded">Remind</button>}
                </div>
              ))}</div>}
              {totalAlerts === 0 && <div className="text-center text-gray-500 py-8">No due date alerts.</div>}
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {pinModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <div className="text-center mb-4">
              <Shield className="w-12 h-12 text-[#1B3A6B] mx-auto mb-2" />
              <h2 className="text-xl font-bold text-[#1B3A6B]">Verify PIN</h2>
              <p className="text-sm text-gray-500">Enter your 4-digit PIN to continue</p>
            </div>
            <input
              type="password"
              maxLength="4"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
              placeholder="****"
              autoFocus
            />
            {pinError && <div className="text-red-500 text-sm text-center mb-3">{pinError}</div>}
            <div className="flex gap-3">
              <button onClick={() => setPinModal({ open: false, targetPath: null })} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              <button onClick={verifyPin} className="flex-1 bg-[#1B3A6B] text-white py-2 rounded-lg">Verify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}