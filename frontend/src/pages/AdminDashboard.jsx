import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, BookOpen, UserCheck, CheckCircle, QrCode, Hash, AlertCircle,
  Clock, TrendingUp, Flame, Star, Bell
} from "lucide-react";
import { format } from "date-fns";
import { Toaster, toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ReferenceLine
} from "recharts";
import { Html5Qrcode } from "html5-qrcode";

const API_URL = import.meta.env.VITE_API_URL;

const AGE_COLORS = {
  Children: "#4CAF50",
  Adolescents: "#2196F3",
  "Young Adults": "#FF9800",
  Adults: "#9C27B0",
  PWD: "#E91E63",
};

const PEAK_HOURS_DATA = [
  { hour: "8 AM", today: 3, weekly: 2 },
  { hour: "9 AM", today: 8, weekly: 6 },
  { hour: "10 AM", today: 12, weekly: 10 },
  { hour: "11 AM", today: 9, weekly: 8 },
  { hour: "12 PM", today: 5, weekly: 7 },
  { hour: "1 PM", today: 7, weekly: 6 },
  { hour: "2 PM", today: 11, weekly: 9 },
  { hour: "3 PM", today: 14, weekly: 11 },
  { hour: "4 PM", today: 8, weekly: 7 },
  { hour: "5 PM", today: 4, weekly: 3 },
];
const CURRENT_HOUR = "3 PM";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
        <p className="font-bold text-[#1B3A6B] mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === "today" ? "Today" : "Weekly Avg"}: <strong>{p.value}</strong> visitors
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalToday: 0, checkedIn: 0, checkedOut: 0, activeBorrows: 0 });
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [mostBorrowed, setMostBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [assistedRef, setAssistedRef] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [assistedResult, setAssistedResult] = useState(null);
  const scannerRef = useRef(null);
  const scannerInstance = useRef(null);
  const lastScannedToken = useRef(null);
  const lastScanTime = useRef(0);

  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ---- Data fetching ----
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/visits/stats`, { headers });
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error(err); }
  };
  const fetchActiveVisitors = async () => {
    try {
      const res = await fetch(`${API_URL}/visits/active`, { headers });
      if (res.ok) setActiveVisitors(await res.json());
    } catch (err) { console.error(err); }
  };
  const fetchTodayData = async () => {
    try {
      const res = await fetch(`${API_URL}/visits/today`, { headers });
      if (res.ok) setTodayRecords(await res.json());
    } catch (err) { console.error(err); }
  };
  const fetchDemographics = async () => {
    try {
      const now = new Date();
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        months.push({ year, month, label: d.toLocaleString("default", { month: "short" }) });
      }
      const data = [];
      for (const m of months) {
        const res = await fetch(`${API_URL}/demographics/monthly/${m.year}/${m.month}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.length > 0) {
            data.push({ ...json[0], month: m.label });
          } else {
            data.push({ month: m.label, Children: 0, Adolescents: 0, "Young Adults": 0, Adults: 0, PWD: 0 });
          }
        }
      }
      setBarData(data);
    } catch (err) { console.error(err); }
  };
  const fetchPieData = async () => {
    try {
      const res = await fetch(`${API_URL}/demographics/today`, { headers });
      if (res.ok) setPieData(await res.json());
    } catch (err) { console.error(err); }
  };
  const fetchMostBorrowed = async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const res = await fetch(`${API_URL}/books/most-borrowed?month=${month}&year=${year}`, { headers });
      if (res.ok) setMostBorrowed(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchStats();
    fetchActiveVisitors();
    fetchTodayData();
    fetchDemographics();
    fetchPieData();
    fetchMostBorrowed();
  }, []);

  // ---- QR Scanner (auto start, mirrored) ----
  useEffect(() => {
    const startScanner = async () => {
      if (!scannerRef.current) return;
      if (scannerInstance.current) return;
      try {
        const scanner = new Html5Qrcode("qr-reader-container");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10 },
          (decodedText) => {
            let token = decodedText;
            const match = decodedText.match(/\/api\/visitors\/qr\/([a-f0-9]+)/);
            if (match) token = match[1];
            const now = Date.now();
            if (token === lastScannedToken.current && now - lastScanTime.current < 3000) return;
            lastScannedToken.current = token;
            lastScanTime.current = now;
            handleCheckInOut(token);
          },
          (error) => console.warn(error)
        );
        scannerInstance.current = scanner;
        setTimeout(() => {
          const video = document.querySelector("#qr-reader-container video");
          if (video) video.style.transform = "scaleX(-1)";
        }, 500);
      } catch (err) {
        console.error("Camera error", err);
        toast.error("Could not access camera. Please check permissions.");
      }
    };
    startScanner();
    return () => {
      if (scannerInstance.current) {
        scannerInstance.current.stop().catch(console.warn);
        scannerInstance.current = null;
      }
    };
  }, []);

  // ---- Scan lock to prevent double processing ----
  const scanLock = useRef(false);

  // ---- Check‑in/out (auto toggle) ----
  const handleCheckInOut = async (identifier) => {
    if (!identifier || scanLock.current) return;

    scanLock.current = true;
    setLoading(true);

    try {
      const isReference = identifier.startsWith("LIB-") || identifier.startsWith("REF-");
      const body = isReference
        ? { reference_number: identifier }
        : { qr_token: identifier };

      const res = await fetch(`${API_URL}/visits/scan`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        console.error("INVALID JSON:", text);
        throw new Error("Server returned invalid JSON");
      }

      if (!res.ok) throw new Error(data.error);

      const visit = data.visit;
      const action = data.action;
      const visitorName = visit.visitor.name;

      const message = action === "checkout"
        ? `Checked out ${visitorName}`
        : `Checked in ${visitorName}`;

      toast.success(message);
      setScanResult({ type: "success", message });

      if (action === "checkout") {
        setActiveVisitors((prev) => prev.filter((v) => v.visitor.qr_token !== visit.visitor.qr_token));
      } else {
        setActiveVisitors((prev) => [visit, ...prev]);
      }

      setTodayRecords((prev) => {
        const index = prev.findIndex((r) => r._id === visit._id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = visit;
          return updated;
        }
        return [visit, ...prev];
      });

      setTimeout(() => {
        fetchActiveVisitors();
        fetchStats();
        fetchTodayData();
        fetchPieData();
      }, 500);

    } catch (err) {
      toast.error(err.message);
      setScanResult({ type: "error", message: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => (scanLock.current = false), 3000);
      setTimeout(() => setScanResult(null), 3000);
    }
  };

  const handleAssistedCheckIn = () => {
    if (!assistedRef.trim()) return;
    handleCheckInOut(assistedRef);
    setAssistedResult({ type: "success", message: "Processing..." });
    setAssistedRef("");
    setTimeout(() => setAssistedResult(null), 3000);
  };

  // Peak hours calculations
  const peakHour = PEAK_HOURS_DATA.reduce((a, b) => a.today > b.today ? a : b);
  const quietHour = PEAK_HOURS_DATA.reduce((a, b) => a.today < b.today ? a : b);
  const avgPerHour = Math.round(PEAK_HOURS_DATA.reduce((s, d) => s + d.today, 0) / PEAK_HOURS_DATA.length);
  const currentLoad = PEAK_HOURS_DATA.find(d => d.hour === CURRENT_HOUR)?.today ?? 0;
  const loadLabel = currentLoad >= 12 ? "Busy" : currentLoad >= 7 ? "Moderate" : "Quiet";
  const loadColor = currentLoad >= 12 ? "text-red-600 bg-red-50" : currentLoad >= 7 ? "text-orange-500 bg-orange-50" : "text-green-600 bg-green-50";

  const sortedTodayRecords = [...todayRecords].sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <Toaster position="top-right" />

      {/* Stats Cards (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Today's Visitors", value: stats.totalToday, icon: Users, badge: "bg-blue-100", iconColor: "text-blue-600" },
          { label: "Currently In Library", value: stats.checkedIn, icon: UserCheck, badge: "bg-teal-100", iconColor: "text-teal-600" },
          { label: "Checked Out", value: stats.checkedOut, icon: CheckCircle, badge: "bg-purple-100", iconColor: "text-purple-600" },
          { label: "Active Borrows", value: stats.activeBorrows, icon: BookOpen, badge: "bg-orange-100", iconColor: "text-orange-600" },
        ].map(({ label, value, icon: Icon, badge, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-xl ${badge} flex items-center justify-center mb-2`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-[#1B3A6B]">{value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* QR Scanner + Assisted Check-in (moved above charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#EBF0F7] rounded-xl flex items-center justify-center"><QrCode className="w-4 h-4 text-[#1B3A6B]" /></div>
            <div><h3 className="text-[#1B3A6B] font-bold text-sm">QR Scanner</h3><p className="text-gray-400 text-xs">Check-In / Check-Out</p></div>
          </div>
          <div className="bg-gray-900 rounded-xl aspect-video overflow-hidden mb-3">
            <div id="qr-reader-container" ref={scannerRef} className="w-full h-full"></div>
          </div>
          <div className="flex gap-2">
            <input className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs" placeholder="Paste QR data to simulate scan..." value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCheckInOut(scanInput)} />
            <button onClick={() => { handleCheckInOut(scanInput); setScanInput(""); }} className="bg-[#1B3A6B] text-white px-4 py-2 rounded-xl text-xs font-semibold">Scan</button>
          </div>
          {scanResult && <div className={`mt-2 p-2.5 rounded-xl text-xs ${scanResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{scanResult.message}</div>}
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2 font-semibold">REAL-TIME CHECK-INS TODAY</p>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {sortedTodayRecords.slice(0, 5).map(r => (
                <div key={r._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                  <div>
                    <p className="text-gray-700 text-xs font-semibold">{r.visitor.name}</p>
                    <p className="text-gray-400 text-xs">{r.ageGroup} • {r.purpose}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.status === 'active' ? '● IN' : '○ OUT'}
                    </span>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {r.status === 'active'
                        ? `In: ${new Date(r.check_in_time).toLocaleTimeString()}`
                        : `Out: ${new Date(r.check_out_time || r.check_in_time).toLocaleTimeString()}`}
                    </p>
                  </div>
                </div>
              ))}
              {sortedTodayRecords.length === 0 && <p className="text-gray-400 text-xs text-center py-3">No visitors yet today.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#EBF0F7] rounded-xl flex items-center justify-center"><Hash className="w-4 h-4 text-[#1B3A6B]" /></div>
            <div><h3 className="text-[#1B3A6B] font-bold text-sm">Assisted Check-In</h3><p className="text-gray-400 text-xs">For non-tech visitors / seniors</p></div>
          </div>
          <div className="bg-[#F0F4F8] rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#C9A227] mt-0.5" />
            <p className="text-gray-600 text-xs">Enter the visitor's reference number from their phone.</p>
          </div>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono text-center uppercase"
            placeholder="REF-0000 or LIB-..."
            value={assistedRef}
            onChange={e => setAssistedRef(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleAssistedCheckIn()}
          />
          <button onClick={handleAssistedCheckIn} className="w-full bg-[#C9A227] text-white py-2.5 rounded-xl text-sm font-semibold mt-2">
            Process Check-In
          </button>
          {assistedResult && (
            <div className={`mt-2 p-2.5 rounded-xl text-xs ${assistedResult.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {assistedResult.message}
            </div>
          )}
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2 font-semibold">VISITOR LOG — {format(new Date(), "MMMM d")}</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {sortedTodayRecords.map(r => (
                <div key={r._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-gray-700 text-xs font-semibold">{r.visitor.name}</p>
                    <p className="text-gray-400 text-xs">{r.visitor.gender} • {r.age} yrs • {r.visitor.reference_number}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.status === 'active' ? 'IN' : 'OUT'}
                    </span>
                    {r.status === 'active' && (
                      <button onClick={() => handleCheckInOut(r.visitor.qr_token)} className="text-xs text-red-500 underline">
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {sortedTodayRecords.length === 0 && <p className="text-gray-400 text-xs text-center py-3">No visitors logged today.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[#1B3A6B] font-bold">Monthly Demographics</h3>
              <p className="text-gray-400 text-xs">Visitor categories by age group</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none"><option>Last 3 Months</option></select>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Children" fill={AGE_COLORS.Children} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Adolescents" fill={AGE_COLORS.Adolescents} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Young Adults" fill={AGE_COLORS["Young Adults"]} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Adults" fill={AGE_COLORS.Adults} radius={[3, 3, 0, 0]} />
                <Bar dataKey="PWD" fill={AGE_COLORS.PWD} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3">
            {Object.entries(AGE_COLORS).map(([label, color]) => (
              <div key={label} className="text-center bg-gray-50 rounded-xl p-2">
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: color }} />
                <p className="text-[#1B3A6B] font-bold text-sm">—</p>
                <p className="text-gray-500 text-xs font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-[#1B3A6B] font-bold mb-1">Today's Breakdown</h3>
          <p className="text-gray-400 text-xs mb-3">{format(new Date(), "MMMM d, yyyy")}</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="count">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={Object.values(AGE_COLORS)[index % Object.values(AGE_COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: Object.values(AGE_COLORS)[i] }} />
                  <span className="text-gray-600 text-xs">{d.category}</span>
                </div>
                <span className="text-[#1B3A6B] font-bold text-xs">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most Borrowed Books + Peak Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-[#C9A227]" />
            <h3 className="text-[#1B3A6B] font-bold text-sm">Most Borrowed Books (This Month)</h3>
          </div>
          {mostBorrowed.length === 0 ? (
            <p className="text-gray-400 text-xs">No data available.</p>
          ) : (
            <div className="space-y-2">
              {mostBorrowed.map((book, idx) => (
                <div key={idx} className="flex justify-between items-center border-b pb-1 text-xs">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-700 truncate">{book.title}</p>
                    <p className="text-gray-400">{book.author}</p>
                  </div>
                  <div className="bg-blue-100 text-[#1B3A6B] px-2 py-0.5 rounded-full font-bold">
                    {book.borrowCount} borrows
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="text-[#1B3A6B] font-bold text-sm">Peak Hours</h3>
          </div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-500">Peak: {peakHour.hour} ({peakHour.today} visitors)</span>
            <span className="text-gray-500">Quietest: {quietHour.hour} ({quietHour.today} visitors)</span>
          </div>
          <div className="flex gap-1 mt-1">
            {PEAK_HOURS_DATA.map(d => {
              const pct = Math.round((d.today / peakHour.today) * 100);
              const barColor = pct >= 85 ? "bg-red-400" : pct >= 60 ? "bg-orange-400" : pct >= 35 ? "bg-amber-300" : "bg-blue-200";
              return (
                <div key={d.hour} className="flex-1 flex flex-col items-center">
                  <div className="w-full h-6 bg-gray-100 rounded-sm overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-0.5">{d.hour}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Very busy</span>
            <span>Busy</span>
            <span>Moderate</span>
            <span>Quiet</span>
          </div>
        </div>
      </div>
    </div>
  );
}