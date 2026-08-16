import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isToday, isTomorrow, endOfDay } from "date-fns";
import { Toaster, toast } from "sonner";
import { Search, AlertTriangle, Bell, X, CheckCircle, Mail, QrCode, History, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const API_URL = import.meta.env.VITE_API_URL;

export default function Borrowing() {
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState([]);
  const [filteredActive, setFilteredActive] = useState([]);
  const [historyLoans, setHistoryLoans] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  // Modal States
  const [returnModal, setReturnModal] = useState({ open: false, loan: null, issues: "", issueType: "" });
  const [notReturnedModal, setNotReturnedModal] = useState({ open: false, loan: null, reasonOption: "", customReason: "" });

  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmScannerRef = useRef(null);
  const confirmScannerInstance = useRef(null);
  const lastScannedToken = useRef(null);
  const lastScanTime = useRef(0);

  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const notReturnedReasons = [
    "Misplaced or missing (Fault of user)",
    "Unretrievable due to natural disaster (Flood, Fire, etc.)",
    "User unreachable / Refused return",
    "Severely damaged beyond use",
    "Other"
  ];

  // Helper for safe date formatting without throwing RangeError
  const formatDateSafe = (dateVal, formatStr = "PPP") => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? "—" : format(d, formatStr);
  };

  const fetchActiveLoans = async () => {
    try {
      const res = await fetch(`${API_URL}/loans/active`, { headers });
      if (res.ok) {
        let data = await res.json();
        if (Array.isArray(data)) {
          data.sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
          setActiveLoans(data);
          setFilteredActive(data);
        }
      }
    } catch (err) { console.error("Error fetching active loans:", err); }
  };

  const fetchHistoryLoans = async () => {
    try {
      const res = await fetch(`${API_URL}/loans/history`, { headers });
      if (res.ok) {
        let data = await res.json();
        if (Array.isArray(data)) {
          data.sort((a, b) => {
            const dateA = a.return_date ? new Date(a.return_date) : new Date(a.borrow_date || 0);
            const dateB = b.return_date ? new Date(b.return_date) : new Date(b.borrow_date || 0);
            return dateB - dateA;
          });
          setHistoryLoans(data);
          setFilteredHistory(data);
        }
      }
    } catch (err) { console.error("Error fetching history loans:", err); }
  };

  useEffect(() => {
    fetchActiveLoans();
    fetchHistoryLoans();
  }, []);

  // Filter Search Logic with Safe Null Checks
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    const filterFn = loan => {
      if (!term) return true;
      const title = loan.book?.title?.toLowerCase() || "";
      const visitorName = loan.visitor?.name?.toLowerCase() || "";
      return title.includes(term) || visitorName.includes(term);
    };

    if (activeTab === "active") {
      setFilteredActive(activeLoans.filter(filterFn));
    } else {
      setFilteredHistory(historyLoans.filter(filterFn));
    }
  }, [searchTerm, activeLoans, historyLoans, activeTab]);

  useEffect(() => {
    const startConfirmScanner = async () => {
      if (!confirmScannerRef.current) return;
      if (confirmScannerInstance.current) return;
      try {
        const scanner = new Html5Qrcode("confirm-scanner-container");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10 },
          (decodedText) => {
            const now = Date.now();
            if (decodedText === lastScannedToken.current && now - lastScanTime.current < 2000) return;
            lastScannedToken.current = decodedText;
            lastScanTime.current = now;
            let scanToken = decodedText;
            const match = decodedText.match(/\/api\/loans\/qr\/([a-f0-9]+)/);
            if (match) scanToken = match[1];
            handleConfirmBorrow(scanToken);
          },
          (error) => console.warn(error)
        );
        confirmScannerInstance.current = scanner;
        setTimeout(() => {
          const video = document.querySelector("#confirm-scanner-container video");
          if (video) video.style.transform = "scaleX(-1)";
        }, 500);
      } catch (err) {
        console.error("Camera error", err);
        toast.error("Could not access camera. Please check permissions.");
      }
    };
    startConfirmScanner();
    return () => {
      if (confirmScannerInstance.current) {
        confirmScannerInstance.current.stop().catch(console.warn);
        confirmScannerInstance.current = null;
      }
    };
  }, []);

  const handleConfirmBorrow = async (borrowTokenOrTokens) => {
    if (!borrowTokenOrTokens) return;
    setLoading(true);
    try {
      const tokens = borrowTokenOrTokens.split(",").map(t => t.trim()).filter(t => t);
      let successCount = 0;
      let errorCount = 0;

      for (const t of tokens) {
        try {
          const res = await fetch(`${API_URL}/loans/confirm/${t}`, {
            method: "POST",
            headers,
          });
          if (!res.ok) throw new Error(await res.text());
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Failed for token ${t}:`, err.message);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} loan(s) confirmed. ${errorCount > 0 ? `${errorCount} failed.` : ""}`);
      } else {
        toast.error("No loans confirmed. Check tokens.");
      }

      fetchActiveLoans();
      fetchHistoryLoans();
      setConfirmInput("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBook = async (borrowToken, issues = "") => {
    if (!borrowToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/loans/return`, {
        method: "POST", headers,
        body: JSON.stringify({ borrow_qr_token: borrowToken, issues })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Book returned");
      fetchActiveLoans();
      fetchHistoryLoans();
      setReturnModal({ open: false, loan: null, issues: "", issueType: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNotReturned = async () => {
    if (!notReturnedModal.loan?.borrow_qr_token) return;
    if (!notReturnedModal.reasonOption) {
      toast.error("Please select a reason why the book was not returned.");
      return;
    }

    let finalReason = notReturnedModal.reasonOption;
    if (notReturnedModal.reasonOption === "Other" || notReturnedModal.customReason.trim()) {
      if (notReturnedModal.reasonOption === "Other" && !notReturnedModal.customReason.trim()) {
        toast.error("Please specify the reason in the text field.");
        return;
      }
      finalReason = notReturnedModal.reasonOption === "Other"
        ? `Other: ${notReturnedModal.customReason}`
        : `${notReturnedModal.reasonOption} (${notReturnedModal.customReason})`;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/loans/not-returned/${notReturnedModal.loan.borrow_qr_token}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: finalReason }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Book marked as not returned");
      fetchActiveLoans();
      fetchHistoryLoans();
      setNotReturnedModal({ open: false, loan: null, reasonOption: "", customReason: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (loan) => {
    if (loan.reminder_sent) return;
    try {
      const res = await fetch(`${API_URL}/loans/${loan._id}/reminder`, { method: "POST", headers });
      if (!res.ok) throw new Error("Failed to send reminder");
      
      setActiveLoans(prev => prev.map(item => item._id === loan._id ? { ...item, reminder_sent: true } : item));
      toast.success(`Reminder sent to ${loan.email || loan.visitor?.email || "borrower"}`);
    } catch (err) {
      toast.error(err.message || "Failed to send reminder");
    }
  };

  const handleRetrieve = async (loan) => {
    if (!window.confirm(`Retrieve "${loan.book?.title || "this book"}"? It will become active again and you can process a proper return.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/loans/retrieve/${loan._id}`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Loan retrieved back to active");
      fetchActiveLoans();
      fetchHistoryLoans();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (loan) => {
    setReturnModal({ open: true, loan, issues: "", issueType: "" });
  };

  const openNotReturnedModal = (loan) => {
    setNotReturnedModal({ open: true, loan, reasonOption: "", customReason: "" });
  };

  const handleConfirmReturn = () => {
    let finalIssue = "";
    if (returnModal.issueType === "yes") {
      if (returnModal.issues.trim()) {
        finalIssue = returnModal.issues;
      } else {
        toast.error("Please describe the issue or select a predefined one.");
        return;
      }
    } else if (returnModal.issueType === "no") {
      finalIssue = "";
    } else {
      toast.error("Please select Yes or No for issues.");
      return;
    }
    handleReturnBook(returnModal.loan?.borrow_qr_token, finalIssue);
  };

  const issueOptions = ["Missing/Lost", "Torn pages", "Water damage", "Vandalized", "Cover torn"];

  const overdueLoans = activeLoans.filter(l => l.due_date && isPast(endOfDay(new Date(l.due_date))) && l.status !== "returned" && l.status !== "not_returned");
  const dueTodayLoans = activeLoans.filter(l => l.due_date && isToday(new Date(l.due_date)) && l.status === "borrowed");
  const dueTomorrowLoans = activeLoans.filter(l => l.due_date && isTomorrow(new Date(l.due_date)) && l.status === "borrowed");
  const alertCount = overdueLoans.length + dueTodayLoans.length + dueTomorrowLoans.length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <Toaster position="top-right" />

      {activeTab === "active" && alertCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 w-5 h-5 shrink-0" />
            <span className="font-bold text-red-700">{overdueLoans.length} Overdue • {dueTodayLoans.length} Due Today • {dueTomorrowLoans.length} Due Tomorrow</span>
            <span className="text-sm text-red-700 hidden md:inline">The system will send SMS & email reminders on due date.</span>
          </div>
          <button onClick={() => setShowNotificationPanel(true)} className="bg-red-600 text-white px-3 py-1 rounded-xl flex items-center gap-1 text-sm">
            <Bell className="w-4 h-4" /> View All
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#EBF0F7] rounded-xl flex items-center justify-center">
              <QrCode className="w-4 h-4 text-[#1B3A6B]" />
            </div>
            <div>
              <h3 className="text-[#1B3A6B] font-bold text-sm">Confirm Borrow QR</h3>
              <p className="text-gray-400 text-xs">Scan visitor's borrow QR to activate loan</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl w-full overflow-hidden aspect-video">
            <div id="confirm-scanner-container" ref={confirmScannerRef} className="w-full h-full"></div>
          </div>
          <div className="flex gap-2 mt-3">
            <input
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs"
              placeholder="Paste borrow QR token"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirmBorrow(confirmInput)}
            />
            <button onClick={() => handleConfirmBorrow(confirmInput)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Confirm</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex gap-2">
              <button onClick={() => setActiveTab("active")} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${activeTab === "active" ? "bg-[#1B3A6B] text-white" : "bg-gray-200 text-gray-700"}`}>Active Loans</button>
              <button onClick={() => setActiveTab("history")} className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 ${activeTab === "history" ? "bg-[#1B3A6B] text-white" : "bg-gray-200 text-gray-700"}`}><History className="w-4 h-4" /> History</button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search book or borrower..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" />
            </div>
          </div>

          {activeTab === "active" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-[#F5F7FA]"><tr><th className="p-2 text-left">Book</th><th>Borrower</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredActive.map(loan => {
                      const due = loan.due_date ? new Date(loan.due_date) : null;
                      const isLoanOverdue = due && isPast(endOfDay(due)) && loan.status !== "returned" && loan.status !== "not_returned";
                      const isNotReturned = loan.status === "not_returned";
                      const isUserSuspended = loan.visitor?.is_suspended || loan.visitor?.status === "blocked";
                      
                      let statusText = "Borrowed", statusClass = "text-blue-600 bg-blue-50";
                      if (loan.status === "returned") { statusText = "Returned"; statusClass = "text-green-600 bg-green-50"; }
                      else if (isNotReturned) { statusText = "Not Returned"; statusClass = "text-red-600 bg-red-50 font-bold"; }
                      else if (isLoanOverdue) { statusText = "Overdue"; statusClass = "text-red-600 bg-red-50 font-bold"; }
                      else if (due && isToday(due)) { statusText = "Due Today"; statusClass = "text-orange-600 bg-orange-50 font-bold animate-pulse"; }
                      else if (due && isTomorrow(due)) { statusText = "Due Tomorrow"; statusClass = "text-yellow-600 bg-yellow-50"; }

                      return (
                        <tr key={loan._id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <span className="font-medium">{loan.book?.title || "Unknown Book"}</span>
                            <div className="text-gray-400 text-[11px]">{loan.book?.author || "Unknown Author"}</div>
                            {loan.return_issues && <div className="text-red-500 text-[11px]">⚠ {loan.return_issues}</div>}
                          </td>
                          <td className="p-2">
                            <div className="font-medium flex items-center gap-1">
                              {loan.visitor?.name || "Unknown Visitor"}
                              {isUserSuspended && (
                                <span className="text-[10px] bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" /> SUSPENDED
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-[11px]">{loan.email || loan.visitor?.email}<br />{loan.phone || loan.visitor?.phone}</div>
                          </td>
                          <td className="p-2">{formatDateSafe(loan.due_date)}</td>
                          <td className="p-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass}`}>{statusText}</span></td>
                          <td className="p-2 space-y-1">
                            {loan.status !== "returned" && loan.status !== "not_returned" && (
                              <>
                                <button onClick={() => openReturnModal(loan)} className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded w-full">Mark Returned</button>
                                <button onClick={() => openNotReturnedModal(loan)} className="bg-red-600 text-white text-[11px] px-2 py-1 rounded w-full">Not Returned</button>
                              </>
                            )}

                            {!loan.reminder_sent && loan.status !== "returned" && loan.status !== "not_returned" && (
                              <button onClick={() => handleSendReminder(loan)} className="bg-orange-500 text-white text-[11px] px-2 py-1 rounded w-full flex items-center justify-center gap-1"><Mail className="w-3 h-3" /> Remind</button>
                            )}
                            {loan.reminder_sent && <span className="text-green-600 text-[11px] flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Reminder Sent</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredActive.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-4">No active loans found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-[#F5F7FA]"><tr><th className="p-2 text-left">Book</th><th>Borrower</th><th>Borrow Date</th><th>Return Date</th><th>Status / Reason</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredHistory.map(loan => {
                      const statusText = loan.status === 'returned' ? "Returned" : "Not Returned";
                      const statusClass = loan.status === 'returned' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
                      const isUserSuspended = loan.visitor?.is_suspended || loan.visitor?.status === "blocked";

                      return (
                        <tr key={loan._id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <span className="font-medium">{loan.book?.title || "Unknown Book"}</span>
                            <div className="text-gray-400 text-[11px]">{loan.book?.author || "Unknown Author"}</div>
                            {loan.return_issues && <div className="text-red-500 text-[11px]">⚠ {loan.return_issues}</div>}
                          </td>
                          <td className="p-2">
                            <div className="font-medium flex items-center gap-1">
                              {loan.visitor?.name || "Unknown Visitor"}
                              {isUserSuspended && (
                                <span className="text-[10px] bg-red-100 text-red-700 border border-red-300 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" /> SUSPENDED
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-[11px]">{loan.email || loan.visitor?.email}<br />{loan.phone || loan.visitor?.phone}</div>
                          </td>
                          <td className="p-2">{formatDateSafe(loan.borrow_date)}</td>
                          <td className="p-2">{formatDateSafe(loan.return_date)}</td>
                          <td className="p-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass}`}>{statusText}</span>
                            {loan.not_returned_reason && <div className="text-red-600 text-[10px] mt-1 italic">Reason: {loan.not_returned_reason}</div>}
                          </td>
                          <td className="p-2 space-y-1">
                            <button onClick={() => handleRetrieve(loan)} className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded w-full">Retrieve</button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredHistory.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-4">No history records found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotificationPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-sm h-full shadow-xl flex flex-col">
            <div className="bg-red-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2"><Bell className="w-5 h-5" /> Reminder ({alertCount})</div>
              <button onClick={() => setShowNotificationPanel(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {overdueLoans.length > 0 && (
                <div>
                  <div className="bg-red-50 p-2 font-bold text-red-700">🚨 OVERDUE</div>
                  {overdueLoans.map(l => (
                    <div key={l._id} className="border-b py-2">
                      <div className="font-medium">{l.book?.title}</div>
                      <div>{l.visitor?.name} | {l.email || l.visitor?.email}<br />Due: {formatDateSafe(l.due_date)}</div>
                      {!l.reminder_sent ? (
                        <button onClick={() => handleSendReminder(l)} className="mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded">Remind</button>
                      ) : <span className="text-green-600 text-xs">✓ Sent</span>}
                    </div>
                  ))}
                </div>
              )}
              {dueTodayLoans.length > 0 && (
                <div>
                  <div className="bg-orange-50 p-2 font-bold text-orange-700">⏰ DUE TODAY</div>
                  {dueTodayLoans.map(l => (
                    <div key={l._id} className="border-b py-2">
                      <div className="font-medium">{l.book?.title}</div>
                      <div>{l.visitor?.name} | {l.email || l.visitor?.email}</div>
                      {!l.reminder_sent ? (
                        <button onClick={() => handleSendReminder(l)} className="mt-1 bg-orange-500 text-white text-xs px-2 py-1 rounded">Remind</button>
                      ) : <span className="text-green-600 text-xs">✓ Sent</span>}
                    </div>
                  ))}
                </div>
              )}
              {dueTomorrowLoans.length > 0 && (
                <div>
                  <div className="bg-yellow-50 p-2 font-bold text-yellow-700">📅 DUE TOMORROW</div>
                  {dueTomorrowLoans.map(l => (
                    <div key={l._id} className="border-b py-2">
                      <div className="font-medium">{l.book?.title}</div>
                      <div>{l.visitor?.name} | {l.email || l.visitor?.email}</div>
                      {!l.reminder_sent ? (
                        <button onClick={() => handleSendReminder(l)} className="mt-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded">Remind</button>
                      ) : <span className="text-green-600 text-xs">✓ Sent</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Issue Modal */}
      {returnModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Return: {returnModal.loan?.book?.title || "Book"}</h3>
              <button onClick={() => setReturnModal({ open: false, loan: null, issues: "", issueType: "" })}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Is there an issue with the returned book?</p>
            <div className="flex gap-3 mb-3">
              <button onClick={() => setReturnModal({ ...returnModal, issueType: "yes" })} className={`flex-1 py-2 rounded-lg border ${returnModal.issueType === "yes" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-300"}`}>⚠ Yes, there is an issue</button>
              <button onClick={() => setReturnModal({ ...returnModal, issueType: "no" })} className={`flex-1 py-2 rounded-lg border ${returnModal.issueType === "no" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-300"}`}>✅ No issues</button>
            </div>
            {returnModal.issueType === "yes" && (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {issueOptions.map(issue => <button key={issue} onClick={() => setReturnModal({ ...returnModal, issues: issue })} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${returnModal.issues === issue ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{issue}</button>)}
                  <button onClick={() => setReturnModal({ ...returnModal, issues: "Other: " })} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${returnModal.issues && returnModal.issues.startsWith("Other:") ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>Other (specify)</button>
                </div>
                <textarea value={returnModal.issues} onChange={e => setReturnModal({ ...returnModal, issues: e.target.value })} placeholder="Describe the issue..." rows={2} className="w-full border rounded-lg p-2 text-sm mb-3" />
              </>
            )}
            <div className="flex gap-2">
              <button onClick={() => setReturnModal({ open: false, loan: null, issues: "", issueType: "" })} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
              <button onClick={handleConfirmReturn} className="flex-1 bg-blue-600 text-white py-2 rounded">Confirm Return</button>
            </div>
          </div>
        </div>
      )}

      {/* Not Returned Reason Modal */}
      {notReturnedModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-red-600">Mark as Not Returned</h3>
              <button onClick={() => setNotReturnedModal({ open: false, loan: null, reasonOption: "", customReason: "" })}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-1">Book: <span className="font-semibold">{notReturnedModal.loan?.book?.title}</span></p>
            <p className="text-sm text-gray-600 mb-3">Borrower: <span className="font-semibold">{notReturnedModal.loan?.visitor?.name}</span></p>
            
            <p className="text-xs font-semibold text-gray-700 mb-2">Select Reason for Unreturned Book:</p>
            <div className="space-y-2 mb-3">
              {notReturnedReasons.map(reason => (
                <label key={reason} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${notReturnedModal.reasonOption === reason ? "border-red-500 bg-red-50 text-red-700 font-semibold" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input
                    type="radio"
                    name="notReturnedReason"
                    checked={notReturnedModal.reasonOption === reason}
                    onChange={() => setNotReturnedModal({ ...notReturnedModal, reasonOption: reason })}
                  />
                  {reason}
                </label>
              ))}
            </div>

            <textarea
              value={notReturnedModal.customReason}
              onChange={e => setNotReturnedModal({ ...notReturnedModal, customReason: e.target.value })}
              placeholder={notReturnedModal.reasonOption === "Other" ? "Please specify reason details (required)..." : "Additional details (optional)..."}
              rows={2}
              className="w-full border rounded-lg p-2 text-xs mb-4 focus:ring-1 focus:ring-red-500"
            />

            <div className="flex gap-2">
              <button onClick={() => setNotReturnedModal({ open: false, loan: null, reasonOption: "", customReason: "" })} className="flex-1 bg-gray-200 py-2 rounded text-xs font-semibold">Cancel</button>
              <button onClick={handleConfirmNotReturned} disabled={loading} className="flex-1 bg-red-600 text-white py-2 rounded text-xs font-semibold hover:bg-red-700">Submit Unreturned</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}