import { useState, useEffect } from "react";
import { BarChart3, FileText, File, Edit3, Check, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";

const API_URL = import.meta.env.VITE_API_URL;

export default function ProgressData() {
   const [month, setMonth] = useState(3);
   const [year, setYear] = useState(2026);
   const [report, setReport] = useState(null);
   const [tempData, setTempData] = useState(null);
   const [editingCell, setEditingCell] = useState({ row: null, col: null });
   const [editValue, setEditValue] = useState("");
   const [mostBorrowed, setMostBorrowed] = useState([]);
   const [loading, setLoading] = useState(true);
   const token = localStorage.getItem("token");
   const headers = { Authorization: `Bearer ${token}` };

   const fetchReport = async () => {
      try {
         const res = await fetch(
            `${API_URL}/reports/monthly/${year}/${month}`,
            { headers },
         );
         if (res.ok) {
            const data = await res.json();
            setReport(data.data);
            setTempData(data.data);
         } else {
            // Initialize empty structure
            const empty = {
               visitorDemographics: {
                  "Children (6–12 yrs)": { male: 0, female: 0 },
                  "Adolescents (13–21 yrs)": { male: 0, female: 0 },
                  "Young Adults (22–35 yrs)": { male: 0, female: 0 },
                  "Adults (36 yrs+)": { male: 0, female: 0 },
                  "PWD (Persons w/ Disability)": { male: 0, female: 0 },
               },
            };
            setReport(empty);
            setTempData(empty);
         }
      } catch (err) {
         console.error(err);
         toast.error("Failed to load report");
      }
   };

   const fetchMostBorrowed = async () => {
      try {
         const res = await fetch(
            `${API_URL}/books/most-borrowed?month=${month}&year=${year}`,
            { headers },
         );
         if (res.ok) setMostBorrowed(await res.json());
      } catch (err) {
         console.error(err);
      }
   };

   useEffect(() => {
      const loadData = async () => {
         setLoading(true);
         await Promise.all([fetchReport(), fetchMostBorrowed()]);
         setLoading(false);
      };
      loadData();
   }, [month, year]);

   const saveReport = async () => {
      if (!tempData) return;
      try {
         await fetch(`${API_URL}/reports/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ month, year, data: tempData }),
         });
         setReport(tempData);
         toast.success("Report saved");
      } catch (err) {
         toast.error("Failed to save");
      }
   };

   const handleExportDOC = () => {
      const element = document.getElementById("report-table");
      if (!element) return;
      const htmlContent = element.outerHTML;
      const blob = new Blob([htmlContent], { type: "application/msword" });
      saveAs(blob, `accomplishment_${year}_${month}.doc`);
      toast.success("DOC exported");
   };

   const handleExportPDF = () => {
      const element = document.getElementById("report-table");
      if (!element) return;
      html2pdf().from(element).save(`accomplishment_${year}_${month}.pdf`);
      toast.success("PDF exported");
   };

   const handleCellClick = (rowKey, col) => {
      if (!tempData) return;
      const value = tempData.visitorDemographics[rowKey][col];
      setEditingCell({ row: rowKey, col });
      setEditValue(value.toString());
   };

   const handleCellSave = () => {
      if (editingCell.row && editingCell.col && tempData) {
         const newVal = parseInt(editValue) || 0;
         setTempData({
            ...tempData,
            visitorDemographics: {
               ...tempData.visitorDemographics,
               [editingCell.row]: {
                  ...tempData.visitorDemographics[editingCell.row],
                  [editingCell.col]: newVal,
               },
            },
         });
      }
      setEditingCell({ row: null, col: null });
   };

   const handleMostBorrowedEdit = (index, newCount) => {
      const updated = [...mostBorrowed];
      updated[index].borrowCount = parseInt(newCount) || 0;
      setMostBorrowed(updated);
   };

   const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
   ];

   if (loading) {
      return <div className="p-8 text-center text-gray-500">Loading...</div>;
   }

   if (!tempData) {
      return (
         <div className="p-8 text-center text-red-500">
            Error loading report data.
         </div>
      );
   }

   return (
      <div className="p-4 md:p-6 space-y-5">
         <Toaster position="top-right" />
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-[#EBF0F7] rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#1B3A6B]" />
               </div>
               <div>
                  <h1 className="text-[#1B3A6B] font-bold text-lg">
                     Progress Data
                  </h1>
                  <p className="text-gray-400 text-xs">
                     Accomplishment Report — Editable
                  </p>
               </div>
            </div>
            <div className="flex gap-2">
               <button
                  onClick={handleExportDOC}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1"
               >
                  <FileText className="w-4 h-4" /> Export DOCS
               </button>
               <button
                  onClick={handleExportPDF}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1"
               >
                  <File className="w-4 h-4" /> Export PDF
               </button>
            </div>
         </div>

         {/* Month Selector */}
         <div className="flex items-center gap-3">
            <span className="text-[#1B3A6B] font-semibold text-sm">
               Select Month:
            </span>
            {[1, 2, 3].map((m) => (
               <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${month === m ? "bg-[#1B3A6B] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
               >
                  {monthNames[m - 1]}
               </button>
            ))}
            <button className="bg-[#C9A227] text-white text-xs px-3 py-1.5 rounded-full">
               + Add Month
            </button>
         </div>

         {/* Report Table */}
         <div
            id="report-table"
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
         >
            <div className="text-center mb-4">
               <h2 className="text-[#1B3A6B] font-bold text-base">
                  POLANGUI MUNICIPAL LIBRARY
               </h2>
               <p className="text-gray-600 text-sm">
                  Accomplishment Report — {monthNames[month - 1]} {year}
               </p>
               <p className="text-gray-400 text-xs">
                  Visitor Statistics by Age Category
               </p>
            </div>
            <table className="w-full text-xs border-collapse">
               <thead>
                  <tr className="bg-[#1B3A6B] text-white">
                     <th className="border border-blue-900 p-2 text-left">
                        CATEGORY
                     </th>
                     <th className="border border-blue-900 p-2">MALE</th>
                     <th className="border border-blue-900 p-2">FEMALE</th>
                     <th className="border border-blue-900 p-2 text-[#C9A227]">
                        TOTAL
                     </th>
                  </tr>
               </thead>
               <tbody>
                  {Object.entries(tempData.visitorDemographics).map(
                     ([cat, vals]) => (
                        <tr
                           key={cat}
                           className="odd:bg-white even:bg-[#F5F7FA]"
                        >
                           <td className="border border-gray-200 p-2">{cat}</td>
                           <td
                              className="border border-gray-200 p-2 text-center cursor-pointer hover:bg-blue-50 group"
                              onClick={() => handleCellClick(cat, "male")}
                           >
                              {editingCell.row === cat &&
                              editingCell.col === "male" ? (
                                 <div className="flex justify-center gap-1">
                                    <input
                                       type="number"
                                       value={editValue}
                                       onChange={(e) =>
                                          setEditValue(e.target.value)
                                       }
                                       className="w-16 border rounded px-1 text-center"
                                       autoFocus
                                    />
                                    <button onClick={handleCellSave}>
                                       <Check className="w-3 h-3 text-green-600" />
                                    </button>
                                    <button
                                       onClick={() =>
                                          setEditingCell({
                                             row: null,
                                             col: null,
                                          })
                                       }
                                    >
                                       <X className="w-3 h-3 text-red-600" />
                                    </button>
                                 </div>
                              ) : (
                                 <span className="group-hover:underline">
                                    {vals.male}{" "}
                                    <Edit3 className="w-3 h-3 inline opacity-0 group-hover:opacity-100" />
                                 </span>
                              )}
                           </td>
                           <td
                              className="border border-gray-200 p-2 text-center cursor-pointer hover:bg-blue-50 group"
                              onClick={() => handleCellClick(cat, "female")}
                           >
                              {editingCell.row === cat &&
                              editingCell.col === "female" ? (
                                 <div className="flex justify-center gap-1">
                                    <input
                                       type="number"
                                       value={editValue}
                                       onChange={(e) =>
                                          setEditValue(e.target.value)
                                       }
                                       className="w-16 border rounded px-1 text-center"
                                    />
                                    <button onClick={handleCellSave}>
                                       <Check className="w-3 h-3 text-green-600" />
                                    </button>
                                    <button
                                       onClick={() =>
                                          setEditingCell({
                                             row: null,
                                             col: null,
                                          })
                                       }
                                    >
                                       <X className="w-3 h-3 text-red-600" />
                                    </button>
                                 </div>
                              ) : (
                                 <span className="group-hover:underline">
                                    {vals.female}{" "}
                                    <Edit3 className="w-3 h-3 inline opacity-0 group-hover:opacity-100" />
                                 </span>
                              )}
                           </td>
                           <td className="border border-gray-200 p-2 text-center bg-blue-50 text-[#1B3A6B] font-bold">
                              {vals.male + vals.female}
                           </td>
                        </tr>
                     ),
                  )}
                  <tr className="bg-[#1B3A6B] text-white">
                     <td className="border border-blue-900 p-2 font-bold">
                        GRAND TOTAL
                     </td>
                     <td className="border border-blue-900 p-2 text-center">
                        {Object.values(tempData.visitorDemographics).reduce(
                           (s, v) => s + v.male,
                           0,
                        )}
                     </td>
                     <td className="border border-blue-900 p-2 text-center">
                        {Object.values(tempData.visitorDemographics).reduce(
                           (s, v) => s + v.female,
                           0,
                        )}
                     </td>
                     <td className="border border-blue-900 p-2 text-center text-[#C9A227] font-bold">
                        {Object.values(tempData.visitorDemographics).reduce(
                           (s, v) => s + v.male + v.female,
                           0,
                        )}
                     </td>
                  </tr>
               </tbody>
            </table>
            <p className="text-gray-400 text-xs mt-3 flex items-center gap-1">
               <Edit3 className="w-3 h-3" /> Click any cell to edit values.
               Changes are saved automatically.
            </p>
         </div>

         {/* Most Borrowed Books */}
         <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-[#1B3A6B] font-bold text-base mb-3">
               Total Books Borrowed in the Library
            </h3>
            <table className="w-full text-xs border-collapse">
               <thead>
                  <tr className="bg-[#1B3A6B] text-white">
                     <th className="border border-blue-900 p-2">Rank</th>
                     <th className="border border-blue-900 p-2">Book Title</th>
                     <th className="border border-blue-900 p-2">Author</th>
                     <th className="border border-blue-900 p-2">Category</th>
                     <th className="border border-blue-900 p-2">
                        Times Borrowed
                     </th>
                  </tr>
               </thead>
               <tbody>
                  {mostBorrowed.length === 0 ? (
                     <tr>
                        <td
                           colSpan={5}
                           className="text-center p-4 text-gray-400"
                        >
                           No borrowing data available.
                        </td>
                     </tr>
                  ) : (
                     mostBorrowed.map((book, idx) => (
                        <tr
                           key={idx}
                           className={
                              idx % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"
                           }
                        >
                           <td
                              className={`border border-gray-200 p-2 text-center ${idx === 0 ? "text-[#C9A227] font-bold" : idx === 1 ? "text-gray-500 font-bold" : idx === 2 ? "text-orange-600 font-bold" : "text-gray-500"}`}
                           >
                              {idx === 0
                                 ? "🥇 1st"
                                 : idx === 1
                                   ? "🥈 2nd"
                                   : idx === 2
                                     ? "🥉 3rd"
                                     : `${idx + 1}th`}
                           </td>
                           <td className="border border-gray-200 p-2">
                              {book.title}
                           </td>
                           <td className="border border-gray-200 p-2">
                              {book.author}
                           </td>
                           <td className="border border-gray-200 p-2">
                              <span className="bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">
                                 {book.category}
                              </span>
                           </td>
                           <td className="border border-gray-200 p-2 text-center">
                              <input
                                 type="number"
                                 value={book.borrowCount}
                                 onChange={(e) =>
                                    handleMostBorrowedEdit(idx, e.target.value)
                                 }
                                 className="w-16 text-center border rounded px-1"
                              />
                           </td>
                        </tr>
                     ))
                  )}
                  {mostBorrowed.length > 0 && (
                     <tr className="bg-[#1B3A6B] text-white">
                        <td
                           colSpan={4}
                           className="border border-blue-900 p-2 font-bold"
                        >
                           TOTAL BOOKS BORROWED
                        </td>
                        <td className="border border-blue-900 p-2 text-center text-[#C9A227] font-bold">
                           {mostBorrowed.reduce((s, b) => s + b.borrowCount, 0)}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Export Banner */}
         <div className="bg-[#1B3A6B] rounded-2xl p-5 flex justify-between items-center">
            <div>
               <p className="text-white font-bold">
                  Export Accomplishment Report
               </p>
               <p className="text-blue-200 text-xs">
                  Download the full report for {monthNames[month - 1]} {year}{" "}
                  with all statistics
               </p>
            </div>
            <div className="flex gap-3">
               <button
                  onClick={handleExportDOC}
                  className="bg-white text-[#1B3A6B] text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-1"
               >
                  <FileText className="w-4 h-4" /> Export as DOCS
               </button>
               <button
                  onClick={handleExportPDF}
                  className="bg-[#C9A227] text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-1"
               >
                  <File className="w-4 h-4" /> Export as PDF
               </button>
            </div>
         </div>
      </div>
   );
}
