import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, LayoutDashboard, BookMarked, BarChart3, Smartphone,
  LogOut, Bell, Menu, X, ChevronRight
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/borrowing", label: "Borrowing & Returning", icon: BookMarked },
  { path: "/admin/progress", label: "Progress Data", icon: BarChart3 },
  { path: "/admin/visitor-pass", label: "Visitor Mobile Pass", icon: Smartphone },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [staff, setStaff] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    const storedStaff = localStorage.getItem("staff");
    if (storedStaff) setStaff(JSON.parse(storedStaff));

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/loans/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const loans = await res.json();
          const today = new Date().toISOString().split("T")[0];
          const dueToday = loans.filter(l => l.due_date === today && l.status === "borrowed");
          const overdue = loans.filter(l => l.due_date < today && l.status !== "returned");
          setTotalAlerts(dueToday.length + overdue.length);
        }
      } catch (err) { console.error(err); }
    };
    fetchAlerts();
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("staff");
    navigate("/admin/login");
  };

  const currentNav = NAV_ITEMS.find(n => location.pathname === n.path);

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#1B3A6B] flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#C9A227] rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold">Polangui Municipal</p>
              <p className="text-[#C9A227] text-xs font-bold">LIBRARY</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-white/50 lg:hidden">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 bg-white/10 rounded-lg p-2.5">
            <p className="text-blue-200 text-xs">Logged in as</p>
            <p className="text-white text-sm font-semibold">{staff?.username || "Staff"}</p>
            <p className="text-blue-300 text-xs">{staff?.position}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => { navigate(path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-white text-[#1B3A6B] font-bold shadow-md"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
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
            <h1 className="text-[#1B3A6B] font-bold text-sm">{currentNav?.label || "Admin"}</h1>
            <p className="text-gray-400 text-xs">
              {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} • QR-Based Library Management System
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/borrowing")}
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
    </div>
  );
}