import { useState, useEffect } from "react";
import { BarChart3, FileText, File, AlertTriangle } from "lucide-react";
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

export default function ProgressData() {
  const [month, setMonth] = useState(3);
  const [year, setYear] = useState(2026);
  const [tempData, setTempData] = useState(null);
  const [mostBorrowed, setMostBorrowed] = useState([]);
  const [returnIssues, setReturnIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

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
      const res = await fetch(`${API_URL}/loans/returned-issues`, { headers });
      const data = res.ok ? await res.json() : [];
      setReturnIssues(data || []);
    } catch {
      setReturnIssues([]);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchReport(), fetchMostBorrowed(), fetchReturnIssues()]);
      setLoading(false);
    })();
  }, [month, year]);

  const handleExportDOC = () => {
    const element = document.getElementById("report-content");
    if (!element) {
      toast.error("Report content not found");
      return;
    }
    const clone = element.cloneNode(true);
    const style = document.createElement("style");
    style.textContent = `
      body { font-family: Arial, sans-serif; margin: 40px; }
      .report-table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      .report-table th, .report-table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      .report-table th { background-color: #1B3A6B; color: white; }
      .gold-text { color: #C9A227; }
      .total-row { background-color: #1B3A6B; color: white; font-weight: bold; }
      .category-chip { background-color: #EBF0F7; color: #1B3A6B; padding: 2px 8px; border-radius: 20px; display: inline-block; }
      .orange-bg { background-color: #FFF3E0; }
      .orange-header { background-color: #FF9800; color: white; }
      .alert-icon { color: #FF9800; }
    `;
    clone.prepend(style);
    const htmlContent = clone.outerHTML;
    const blob = new Blob([htmlContent], { type: "application/msword" });
    saveAs(blob, `accomplishment_${year}_${month}.doc`);
    toast.success("DOC exported");
  };

  const handleExportPDF = () => {
    const element = document.getElementById("report-content");
    if (!element) {
      toast.error("Report content not found");
      return;
    }
    html2pdf().from(element).set({
      margin: 0.5,
      filename: `accomplishment_${year}_${month}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).save();
    toast.success("PDF exported");
  };

  const totals = Object.values(tempData?.visitorDemographics || {}).reduce(
    (acc, v) => {
      acc.male += v.male || 0;
      acc.female += v.female || 0;
      return acc;
    },
    { male: 0, female: 0 }
  );
  const grandTotal = totals.male + totals.female;

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const monthNames = ["January", "February", "March"];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster position="top-right" />

      {/* Month Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[#1B3A6B] font-semibold text-sm">Select Month:</span>
        {[1, 2, 3].map((m) => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${month === m ? "bg-[#1B3A6B] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {monthNames[m - 1]} {year}
          </button>
        ))}
      </div>

      {/* Report Content (for export) */}
      <div id="report-content" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-6">
        {/* Accomplishment Report Table */}
        <div>
          <div className="text-center mb-4">
            <h2 className="text-[#1B3A6B] font-bold text-base">POLANGUI MUNICIPAL LIBRARY</h2>
            <p className="text-gray-600 text-sm">Accomplishment Report — {monthNames[month - 1]} {year}</p>
            <p className="text-gray-400 text-xs">Visitor Statistics by Age Category</p>
          </div>
          <table className="w-full text-xs border-collapse report-table">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-blue-900 p-2 text-left">CATEGORY</th>
                <th className="border border-blue-900 p-2">MALE</th>
                <th className="border border-blue-900 p-2">FEMALE</th>
                <th className="border border-blue-900 p-2 gold-text">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tempData.visitorDemographics).map(([cat, vals], idx) => (
                <tr key={cat} className={idx % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}>
                  <td className="border border-gray-200 p-2">{cat}</td>
                  <td className="border border-gray-200 p-2 text-center">{vals.male}</td>
                  <td className="border border-gray-200 p-2 text-center">{vals.female}</td>
                  <td className="border border-gray-200 p-2 text-center bg-blue-50 text-[#1B3A6B] font-bold">{vals.male + vals.female}</td>
                </tr>
              ))}
              <tr className="bg-[#1B3A6B] text-white">
                <td className="border border-blue-900 p-2 font-bold">GRAND TOTAL</td>
                <td className="border border-blue-900 p-2 text-center">{totals.male}</td>
                <td className="border border-blue-900 p-2 text-center">{totals.female}</td>
                <td className="border border-blue-900 p-2 text-center gold-text font-bold">{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Most Borrowed Books Table */}
        <div>
          <h3 className="text-[#1B3A6B] font-bold text-base mb-3">Total Books Borrowed in the Library</h3>
          <table className="w-full text-xs border-collapse report-table">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-blue-900 p-2">Rank</th>
                <th className="border border-blue-900 p-2">Book Title</th>
                <th className="border border-blue-900 p-2">Author</th>
                <th className="border border-blue-900 p-2">Category</th>
                <th className="border border-blue-900 p-2">Times Borrowed</th>
              </tr>
            </thead>
            <tbody>
              {mostBorrowed.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-4 text-gray-400">No borrowing data available.</td></tr>
              ) : (
                mostBorrowed.map((book, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}>
                    <td className={`border border-gray-200 p-2 text-center ${idx === 0 ? "text-[#C9A227] font-bold" : idx === 1 ? "text-gray-500 font-bold" : idx === 2 ? "text-orange-600 font-bold" : "text-gray-500"}`}>
                      {idx === 0 ? "🥇 1st" : idx === 1 ? "🥈 2nd" : idx === 2 ? "🥉 3rd" : `${idx + 1}th`}
                    </td>
                    <td className="border border-gray-200 p-2">{book.title}</td>
                    <td className="border border-gray-200 p-2">{book.author}</td>
                    <td className="border border-gray-200 p-2"><span className="bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full category-chip">{book.category}</span></td>
                    <td className="border border-gray-200 p-2 text-center font-bold">{book.borrowCount}</td>
                  </tr>
                ))
              )}
              {mostBorrowed.length > 0 && (
                <tr className="bg-[#1B3A6B] text-white">
                  <td colSpan={4} className="border border-blue-900 p-2 font-bold">TOTAL BOOKS BORROWED</td>
                  <td className="border border-blue-900 p-2 text-center gold-text font-bold">
                    {mostBorrowed.reduce((sum, b) => sum + (b.borrowCount || 0), 0)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Books with Return Issues (Conditional) */}
        {returnIssues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-[#1B3A6B] font-bold text-base">Books with Return Issues</h3>
              <p className="text-gray-400 text-xs">Books returned with damage or conditions noted</p>
            </div>
            <table className="w-full text-xs border-collapse report-table">
              <thead>
                <tr className="bg-orange-100 text-orange-800">
                  <th className="border border-orange-200 p-2">Book Title</th>
                  <th className="border border-orange-200 p-2">Author</th>
                  <th className="border border-orange-200 p-2">Issue Reported</th>
                </tr>
              </thead>
              <tbody>
                {returnIssues.map((loan, idx) => (
                  <tr key={loan._id} className={idx % 2 === 0 ? "bg-white" : "bg-orange-50"}>
                    <td className="border border-gray-200 p-2">{loan.book?.title || "Unknown"}</td>
                    <td className="border border-gray-200 p-2">{loan.book?.author || "Unknown"}</td>
                    <td className="border border-gray-200 p-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                      {loan.return_issues}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Banner */}
      <div className="bg-[#1B3A6B] rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-white font-bold">Export Accomplishment Report</p>
          <p className="text-blue-200 text-xs">Download the full report for {monthNames[month-1]} {year} with all statistics</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportDOC} className="bg-white text-[#1B3A6B] text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-1">
            <FileText className="w-4 h-4" /> Export as DOCS
          </button>
          <button onClick={handleExportPDF} className="bg-[#C9A227] text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-1">
            <File className="w-4 h-4" /> Export as PDF
          </button>
        </div>
      </div>
    </div>
  );
}