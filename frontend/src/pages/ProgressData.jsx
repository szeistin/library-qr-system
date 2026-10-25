import { useState, useEffect } from "react";
import { FileText, File, RefreshCw, BookOpen, CheckCircle2, Clock, XCircle, Lock } from "lucide-react";
import { Toaster, toast } from "sonner";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";

const API_URL = import.meta.env.VITE_API_URL;


const defaultDemographics = {
  "Children (6–12 yrs)": { male: 0, female: 0 },
  "Adolescents (13–21 yrs)": { male: 0, female: 0 },
  "Young Adults (22–35 yrs)": { male: 0, female: 0 },
  "Adults (36 yrs+)": { male: 0, female: 0 },
  "PWD (Persons w/ Disability)": { male: 0, female: 0 },
};


// =========================
// EXPORT HELPERS
// =========================
// Convert any CSS color (rgb, oklch, color(), ...) to plain rgb() that Word understands
const _colorCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
function toRgb(color) {
  if (!color || !_colorCanvas) return null;
  try {
    _colorCanvas.width = 1;
    _colorCanvas.height = 1;
    const ctx = _colorCanvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    return `rgb(${r},${g},${b})`;
  } catch {
    return null;
  }
}

// Copy the on-screen look (colors, sizes, borders, padding, spacing) onto the cloned
// elements as inline styles, because Word cannot read Tailwind classes.
function inlineComputedStyles(orig, clone) {
  const origEls = [orig, ...orig.querySelectorAll("*")];
  const cloneEls = [clone, ...clone.querySelectorAll("*")];

  origEls.forEach((o, i) => {
    const c = cloneEls[i];
    if (!c || o instanceof SVGElement) return;

    const cs = window.getComputedStyle(o);
    const tag = o.tagName.toLowerCase();
    const s = c.style;
    const isRoot = i === 0;

    const color = toRgb(cs.color);
    if (color) s.color = color;

    if (!isRoot) {
      const bg = toRgb(cs.backgroundColor);
      if (bg) s.backgroundColor = bg;
    }

    s.fontSize = `${(parseFloat(cs.fontSize) * 0.75).toFixed(1)}pt`;
    s.fontWeight = cs.fontWeight;
    const align = cs.textAlign === "start" ? "left" : cs.textAlign === "end" ? "right" : cs.textAlign;
    s.textAlign = align;
    if (cs.textTransform !== "none") s.textTransform = cs.textTransform;
    if (cs.letterSpacing !== "normal") s.letterSpacing = cs.letterSpacing;

    if (!isRoot) {
      // Borders (only sides that are actually drawn)
      ["Top", "Right", "Bottom", "Left"].forEach((side) => {
        const w = parseFloat(cs[`border${side}Width`]);
        const bc = toRgb(cs[`border${side}Color`]);
        if (w > 0 && cs[`border${side}Style`] !== "none" && bc) {
          s[`border${side}`] = `${w}px solid ${bc}`;
        }
      });

      // Padding for boxes and table cells
      if (["td", "th", "div", "h3"].includes(tag)) {
        s.padding = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
      }

      // Vertical spacing, same as on screen
      if (["div", "h2", "h3", "table", "p"].includes(tag)) {
        s.marginTop = cs.marginTop;
        s.marginBottom = cs.marginBottom;
      }
    }

    if (tag === "table") {
      s.borderCollapse = "collapse";
      s.width = "100%";
    }

    // Keep the same column proportions as on screen
    if (tag === "td" || tag === "th") {
      const table = o.closest("table");
      const tw = table ? table.getBoundingClientRect().width : 0;
      if (tw > 0) {
        s.width = `${((o.getBoundingClientRect().width / tw) * 100).toFixed(1)}%`;
      }
    }
  });
}

export default function ProgressData() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false); 

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
 const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

  useEffect(() => {
    const months = [];
    for (let i = 1; i <= currentMonth; i++) {
      months.push(i);
    }
    setAvailableMonths(months);
  }, [currentMonth]);

  const handlePinSubmit = async (e) => {
  e.preventDefault();
  if (pinInput.length !== 4) {
    toast.error("Please enter a 4-digit PIN");
    return;
  }
  setPinLoading(true);
  try {
    const res = await fetch(`${API_URL}/staff/verify-pin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ pin: pinInput }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Incorrect PIN code");
    setIsUnlocked(true);
    toast.success("Access granted");
  } catch (err) {
    toast.error(err.message);
    setPinInput("");
  } finally {
    setPinLoading(false);
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

  // =========================
  // EXPORT: DOC (A4, 2 cm margins, same look as the screen)
  // =========================
  const handleExportDOC = () => {
    const element = document.getElementById("report-content");
    if (!element) return toast.error("Report content not found");

    const clone = element.cloneNode(true);

    // 1. Copy the on-screen styling onto the clone (before removing icons so both trees match)
    inlineComputedStyles(element, clone);

    // 2. Remove icons
    clone.querySelectorAll("svg").forEach((svg) => svg.remove());

    // 3. The flex summary bar does not exist in Word, so rebuild it as a one-row table
    const box = clone.querySelector(".summary-box");
    if (box) {
      const tbl = document.createElement("table");
      tbl.setAttribute("width", "100%");
      tbl.setAttribute("cellpadding", "0");
      tbl.setAttribute("cellspacing", "0");
      tbl.style.cssText = box.style.cssText;
      tbl.style.borderCollapse = "collapse";
      tbl.style.width = "100%";
      const cells = Array.from(box.children)
        .map(
          (span) =>
            `<td style="text-align:center;border:none;padding:0 4px;color:${span.style.color};font-size:${span.style.fontSize};">${span.innerHTML}</td>`
        )
        .join("");
      tbl.innerHTML = `<tr>${cells}</tr>`;
      box.replaceWith(tbl);
    }

    // 4. Make sure every table fills the page width
    clone.querySelectorAll("table").forEach((t) => t.setAttribute("width", "100%"));

    const htmlContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Accomplishment & Circulation Report</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page WordSection1 {
      size: 21.0cm 29.7cm;
      margin: 2.0cm 2.0cm 2.0cm 2.0cm;
      mso-page-orientation: portrait;
    }
    div.WordSection1 { page: WordSection1; }
    body { font-family: 'Arial', sans-serif; color: #111; line-height: 1.15; }
    p, div, h2, h3 { margin-top: 0; margin-bottom: 0; mso-margin-top-alt: 0; mso-margin-bottom-alt: 0; }
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="WordSection1">
    ${clone.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob(["\ufeff", htmlContent], { type: "application/msword" });
    saveAs(blob, `accomplishment_${year}_${month}.doc`);
    toast.success("DOC exported successfully");
  };

  // =========================
  // EXPORT: PDF (A4 portrait, 0.5 in margins)
  // =========================
  const handleExportPDF = async () => {
    const element = document.getElementById("report-content");
    if (!element) return toast.error("Report content not found");

    // A4 is 8.27 in wide; minus 0.5 in margins each side = 7.27 in, about 698 px at 96 dpi.
    // Rendering a copy at that fixed width keeps the PDF the same size on any screen.
    const PAGE_WIDTH_PX = 698;

    const clone = element.cloneNode(true);
    clone.style.width = `${PAGE_WIDTH_PX}px`;
    clone.style.maxWidth = "none";
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.border = "none";
    clone.style.boxShadow = "none";

    const holder = document.createElement("div");
    holder.style.position = "fixed";
    holder.style.left = "-10000px";
    holder.style.top = "0";
    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      await html2pdf()
        .from(clone)
        .set({
          margin: 0.5,
          filename: `accomplishment_${year}_${month}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            windowWidth: PAGE_WIDTH_PX,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "h3"] },
        })
        .save();
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    } finally {
      holder.remove();
    }
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
            <p className="text-xs text-gray-500 mt-1">
  Enter your 4-digit staff PIN to view accomplishment reports
</p>
</div>
<form onSubmit={handlePinSubmit} className="space-y-3">
  <input
    type="password"
    maxLength={4}
    value={pinInput}
    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
    placeholder="****"
    className="w-full text-center tracking-widest text-2xl font-mono border border-gray-300 rounded-xl p-2 focus:ring-2 focus:ring-[#1B3A6B] outline-none"
    autoFocus
  />
  <button
    type="submit"
    disabled={pinLoading || pinInput.length !== 4}
    className="w-full bg-[#1B3A6B] text-white py-2.5 rounded-xl text-xs font-bold hover:bg-blue-900 transition disabled:opacity-50"
  >
    {pinLoading ? "Verifying..." : "Unlock Report"}
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