import { useState, useEffect } from "react";
import { FileText, File, RefreshCw, BookOpen, CheckCircle2, Clock, XCircle, Lock } from "lucide-react";
import { Toaster, toast } from "sonner";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";

const API_URL = import.meta.env.VITE_API_URL;
const ADMIN_PIN = "1234"; // Adjust to your preferred security PIN

const defaultDemographics = {
  "Children (6–12 yrs)": { male: 0, female: 0 },
  "Adolescents (13–21 yrs)": { male: 0, female: 0 },
  "Young Adults (22–35 yrs)": { male: 0, female: 0 },
  "Adults (36 yrs+)": { male: 0, female: 0 },
  "PWD (Persons w/ Disability)": { male: 0, female: 0 },
};

export default function ProgressData() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [tempData, setTempData] = useState(null);
  const [mostBorrowed, setMostBorrowed] = useState([]);
  const [returnIssues, setReturnIssues] = useState([]);
  const [circulationSummary, setCirculationSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const months = [];
    for (let i = 1; i <= currentMonth; i++) {
      months.push(i);
    }
    setAvailableMonths(months);
  }, [currentMonth]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsUnlocked(true);
      toast.success("Access granted");
    } else {
      toast.error("Incorrect PIN code");
      setPinInput("");
    }
  };

  const normalize = (data) => ({
    visitorDemographics: {
      ...defaultDemographics,
      ...(data?.visitorDemographics || {}),
    },
  });

  const fetchReport = async () => {
    try {
      const res = await fetch(`${API_URL}/reports/monthly/${year}/${month}`, { headers });
      const json = res.ok ? await res.json() : null;
      setTempData(normalize(json?.data));
    } catch {
      setTempData(normalize(null));
    }
  };

  const fetchMostBorrowed = async () => {
    try {
      const res = await fetch(`${API_URL}/books/most-borrowed?month=${month}&year=${year}`, { headers });
      const data = res.ok ? await res.json() : [];
      setMostBorrowed(data || []);
    } catch {
      setMostBorrowed([]);
    }
  };

  const fetchReturnIssues = async () => {
    try {
      const res = await fetch(`${API_URL}/loans/returned-issues?month=${month}&year=${year}`, { headers });
      const data = res.ok ? await res.json() : [];
      setReturnIssues(data || []);
    } catch {
      setReturnIssues([]);
    }
  };

  const fetchCirculationSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/loans/book-status-summary?month=${month}&year=${year}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCirculationSummary(data || []);
      } else {
        const resLoans = await fetch(`${API_URL}/loans/all?month=${month}&year=${year}`, { headers });
        if (resLoans.ok) {
          const loans = await resLoans.json();
          const aggregated = {};
          loans.forEach((item) => {
            const title = item.book?.title || "Unknown Book";
            const author = item.book?.author || "Unknown Author";
            if (!aggregated[title]) {
              aggregated[title] = { title, author, borrowed: 0, returned: 0, unreturned: 0 };
            }
            if (item.status === "returned") aggregated[title].returned += 1;
            else if (item.status === "not_returned") aggregated[title].unreturned += 1;
            else if (item.status === "borrowed") aggregated[title].borrowed += 1;
          });
          setCirculationSummary(Object.values(aggregated));
        }
      }
    } catch {
      setCirculationSummary([]);
    }
  };

  const loadAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    await Promise.all([
      fetchReport(),
      fetchMostBorrowed(),
      fetchReturnIssues(),
      fetchCirculationSummary(),
    ]);
    setLastUpdated(new Date());
    if (isInitial) setLoading(false);
  };

  useEffect(() => {
    if (isUnlocked) {
      loadAllData(true);
      const interval = setInterval(() => {
        loadAllData(false);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [month, year, isUnlocked]);

  const handleExportDOC = () => {
    const element = document.getElementById("report-content");
    if (!element) return toast.error("Report content not found");

    const clone = element.cloneNode(true);
    clone.querySelectorAll("svg").forEach((svg) => svg.remove());

    const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Accomplishment & Circulation Report</title>
  <style>
    body { font-family: 'Arial', sans-serif; font-size: 12pt; color: #111; margin: 30px; }
    h2 { font-size: 14pt; color: #1B3A6B; text-align: center; font-weight: bold; margin-bottom: 4px; }
    p { font-size: 11pt; margin: 2px 0; }
    .subtitle { text-align: center; margin-bottom: 20px; color: #555; }
    .summary-box { border: 1px solid #1B3A6B; background-color: #F5F7FA; padding: 10px; margin-bottom: 20px; font-size: 11pt; font-weight: bold; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    th { background-color: #1B3A6B; color: #ffffff; font-weight: bold; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .section-title { font-size: 12pt; font-weight: bold; color: #1B3A6B; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #1B3A6B; padding-bottom: 3px; }
  </style>
</head>
<body>
  ${clone.innerHTML}
</body>
</html>`;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    saveAs(blob, `accomplishment_${year}_${month}.doc`);
    toast.success("DOC exported successfully");
  };

  const handleExportPDF = () => {
    const element = document.getElementById("report-content");
    if (!element) return toast.error("Report content not found");

    html2pdf().from(element).set({
      margin: 0.5,
      filename: `accomplishment_${year}_${month}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    }).save();
    toast.success("PDF exported successfully");
  };

  // PIN Protection Gate
  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Toaster position="top-right" />
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-[#1B3A6B] rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-base">Restricted Access</h3>
            <p className="text-xs text-gray-500 mt-1">Enter PIN code to view accomplishment reports</p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              className="w-full text-center tracking-widest text-lg font-bold border border-gray-300 rounded p-2 focus:ring-2 focus:ring-[#1B3A6B] outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-[#1B3A6B] text-white py-2 rounded text-xs font-bold hover:bg-blue-900 transition"
            >
              Unlock Report
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totals = Object.values(tempData?.visitorDemographics || {}).reduce(
    (acc, v) => {
      acc.male += v.male || 0;
      acc.female += v.female || 0;
      return acc;
    },
    { male: 0, female: 0 }
  );
  const grandTotal = totals.male + totals.female;

  const totalReturned = circulationSummary.reduce((sum, item) => sum + (item.returned || 0), 0);
  const totalCurrentlyBorrowed = circulationSummary.reduce((sum, item) => sum + (item.borrowed || 0), 0);
  const totalUnreturned = circulationSummary.reduce((sum, item) => sum + (item.unreturned || 0), 0);
  const totalCirculatedOverall = totalReturned + totalCurrentlyBorrowed + totalUnreturned;

  const issueCountPerTitle = {};
  returnIssues.forEach((item) => {
    const title = item.book?.title || "Unknown";
    issueCountPerTitle[title] = (issueCountPerTitle[title] || 0) + 1;
  });

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium text-sm">Loading Accomplishment Data...</div>;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto text-[12pt]">
      <Toaster position="top-right" />

      {/* Control Header & Live Sync Status */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[#1B3A6B] font-bold text-sm">Select Month:</span>
          {availableMonths.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${month === m ? "bg-[#1B3A6B] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              {monthNames[m - 1]} {year}
            </button>
          ))}
        </div>

        {/* Live Pulsing Ping Indicator */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Live Syncing</span>
          <span className="text-[10px] text-emerald-600 font-normal ml-1">({lastUpdated.toLocaleTimeString()})</span>
        </div>
      </div>

      {/* Printable / Exportable Document Content */}
      <div id="report-content" className="bg-white p-6 shadow-sm border border-gray-200 rounded-md">
        
        {/* Title Banner */}
        <div className="text-center mb-4">
          <h2 className="text-[#1B3A6B] font-bold text-lg uppercase tracking-wide">POLANGUI MUNICIPAL LIBRARY</h2>
          <div className="subtitle text-gray-700 font-semibold text-sm">
            Accomplishment & Circulation Report — {monthNames[month - 1]} {year}
          </div>
        </div>

        {/* Compact Summary Overview Bar */}
        <div className="summary-box flex flex-wrap justify-around bg-gray-50 p-2.5 rounded border border-gray-200 mb-5 text-xs text-[#1B3A6B]">
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-blue-600" /> Total Circulated: <strong className="text-black ml-1">{totalCirculatedOverall}</strong></span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> Currently Borrowed: <strong className="text-black ml-1">{totalCurrentlyBorrowed}</strong></span>
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Returned: <strong className="text-black ml-1">{totalReturned}</strong></span>
          <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-rose-600" /> Unreturned: <strong className="text-black ml-1">{totalUnreturned}</strong></span>
        </div>

        {/* Book Circulation Breakdown Table */}
        <div className="mb-5">
          <h3 className="section-title text-[#1B3A6B] font-bold text-sm mb-2 border-b border-[#1B3A6B] pb-1">Real-time Book Circulation Breakdown</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-gray-300 p-1.5 text-left">Book Title</th>
                <th className="border border-gray-300 p-1.5 text-left">Author</th>
                <th className="border border-gray-300 p-1.5 text-center">Currently Borrowed</th>
                <th className="border border-gray-300 p-1.5 text-center">Returned</th>
                <th className="border border-gray-300 p-1.5 text-center">Unreturned</th>
                <th className="border border-gray-300 p-1.5 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {circulationSummary.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-3 text-gray-500">No circulation activity recorded.</td></tr>
              ) : (
                circulationSummary.map((item, idx) => {
                  const itemTotal = (item.borrowed || 0) + (item.returned || 0) + (item.unreturned || 0);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 p-1.5 font-medium">{item.title}</td>
                      <td className="border border-gray-300 p-1.5 text-gray-600">{item.author}</td>
                      <td className="border border-gray-300 p-1.5 text-center">{item.borrowed || 0}</td>
                      <td className="border border-gray-300 p-1.5 text-center">{item.returned || 0}</td>
                      <td className="border border-gray-300 p-1.5 text-center">{item.unreturned || 0}</td>
                      <td className="border border-gray-300 p-1.5 text-center font-bold text-[#1B3A6B]">{itemTotal}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Visitor Demographics Table */}
        <div className="mb-5">
          <h3 className="section-title text-[#1B3A6B] font-bold text-sm mb-2 border-b border-[#1B3A6B] pb-1">Visitor Statistics by Age Category</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-gray-300 p-1.5 text-left">Category</th>
                <th className="border border-gray-300 p-1.5 text-center">Male</th>
                <th className="border border-gray-300 p-1.5 text-center">Female</th>
                <th className="border border-gray-300 p-1.5 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tempData.visitorDemographics).map(([cat, vals], idx) => (
                <tr key={cat} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-300 p-1.5">{cat}</td>
                  <td className="border border-gray-300 p-1.5 text-center">{vals.male}</td>
                  <td className="border border-gray-300 p-1.5 text-center">{vals.female}</td>
                  <td className="border border-gray-300 p-1.5 text-center font-bold text-[#1B3A6B]">{vals.male + vals.female}</td>
                </tr>
              ))}
              <tr className="bg-[#1B3A6B] text-white font-bold">
                <td className="border border-gray-300 p-1.5">GRAND TOTAL</td>
                <td className="border border-gray-300 p-1.5 text-center">{totals.male}</td>
                <td className="border border-gray-300 p-1.5 text-center">{totals.female}</td>
                <td className="border border-gray-300 p-1.5 text-center">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Top Borrowed Books Ranking */}
        <div className="mb-5">
          <h3 className="section-title text-[#1B3A6B] font-bold text-sm mb-2 border-b border-[#1B3A6B] pb-1">Top Borrowed Books Ranking</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-gray-300 p-1.5 text-center w-12">Rank</th>
                <th className="border border-gray-300 p-1.5 text-left">Book Title</th>
                <th className="border border-gray-300 p-1.5 text-left">Author</th>
                <th className="border border-gray-300 p-1.5 text-left">Category</th>
                <th className="border border-gray-300 p-1.5 text-center">Times Borrowed</th>
              </tr>
            </thead>
            <tbody>
              {mostBorrowed.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-3 text-gray-500">No borrowing ranking data available.</td></tr>
              ) : (
                mostBorrowed.map((book, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-gray-300 p-1.5 font-medium">{book.title}</td>
                    <td className="border border-gray-300 p-1.5 text-gray-600">{book.author}</td>
                    <td className="border border-gray-300 p-1.5">{book.category}</td>
                    <td className="border border-gray-300 p-1.5 text-center font-bold text-[#1B3A6B]">{book.borrowCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Books with Return Issues Table */}
        {returnIssues.length > 0 && (
          <div className="mb-5">
            <h3 className="section-title text-[#1B3A6B] font-bold text-sm mb-2 border-b border-[#1B3A6B] pb-1">Books with Return Issues</h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-100 text-amber-900">
                  <th className="border border-gray-300 p-1.5 text-left">Book Title</th>
                  <th className="border border-gray-300 p-1.5 text-left">Author</th>
                  <th className="border border-gray-300 p-1.5 text-left">Issue Reported</th>
                  <th className="border border-gray-300 p-1.5 text-center">Copies</th>
                </tr>
              </thead>
              <tbody>
                {returnIssues.map((item) => {
                  const title = item.book?.title || "Unknown";
                  const countForTitle = issueCountPerTitle[title] || 0;
                  return (
                    <tr key={item._id}>
                      <td className="border border-gray-300 p-1.5 font-medium">{title}</td>
                      <td className="border border-gray-300 p-1.5">{item.book?.author || "Unknown"}</td>
                      <td className="border border-gray-300 p-1.5 text-amber-700">{item.return_issues}</td>
                      <td className="border border-gray-300 p-1.5 text-center font-bold">{countForTitle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Action Buttons */}
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={handleExportDOC} className="bg-[#1B3A6B] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5 hover:bg-blue-900 transition">
          <FileText className="w-4 h-4" /> Export as DOCS
        </button>
        <button onClick={handleExportPDF} className="bg-[#C9A227] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-1.5 hover:bg-amber-600 transition">
          <File className="w-4 h-4" /> Export as PDF
        </button>
      </div>
    </div>
  );
}