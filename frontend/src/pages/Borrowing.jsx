import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { Toaster, toast } from "sonner";
import { Search, AlertTriangle, Bell, X, CheckCircle, Mail, QrCode } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

const API_URL = import.meta.env.VITE_API_URL;

export default function Borrowing() {
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [returnModal, setReturnModal] = useState({ open: false, loan: null, issues: "" });
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmScannerRef = useRef(null);
  const confirmScannerInstance = useRef(null);
  const lastScannedToken = useRef(null);
  const lastScanTime = useRef(0);
  const [selectedIssue, setSelectedIssue] = useState("");
  const [customIssue, setCustomIssue] = useState("");

  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchActiveLoans = async () => {
    try {
      const res = await fetch(`${API_URL}/loans/active`, { headers });
      if (res.ok) {
        const data = await res.json();
        setActiveLoans(data);
        setFilteredLoans(data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredLoans(activeLoans);
    } else {
      setFilteredLoans(activeLoans.filter(loan =>
        loan.book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.visitor.name.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    }
  }, [searchTerm, activeLoans]);

  // Confirm Borrow Scanner
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
            let token = decodedText;
            const match = decodedText.match(/\/api\/loans\/qr\/([a-f0-9]+)/);
            if (match) token = match[1];
            handleConfirmBorrow(token);
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

  const handleConfirmBorrow = async (borrowToken) => {
    if (!borrowToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/loans/confirm/${borrowToken}`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Loan confirmed. Book has been borrowed.");
      fetchActiveLoans();
      setConfirmInput("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Return book (with issues selection) ----
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
      setReturnModal({ open: false, loan: null, issues: "" });
      setSelectedIssue("");
      setCustomIssue("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Not Returned
  const handleNotReturned = async (loan) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/loans/not-returned/${loan.borrow_qr_token}`, {
        method: "POST", headers,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Book marked as not returned");
      fetchActiveLoans();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (loan) => {
    if (loan.reminder_sent) return;
    try {
      await fetch(`${API_URL}/loans/${loan._id}/reminder`, { method: "POST", headers });
      loan.reminder_sent = true;
      setActiveLoans([...activeLoans]);
      toast.success(`Reminder sent to ${loan.email}`);
    } catch (err) {
      toast.error("Failed to send reminder");
    }
  };

  // Open return modal with pre-selected issue
  const openReturnModal = (loan) => {
    setSelectedIssue("");
    setCustomIssue("");
    setReturnModal({ open: true, loan, issues: "" });
  };

  const handleConfirmReturn = () => {
    let finalIssue = "";
    if (selectedIssue === "custom") {
      finalIssue = customIssue;
    } else if (selectedIssue) {
      finalIssue = selectedIssue;
    }
    if (!finalIssue) {
      toast.error("Please select an issue or type a description");
      return;
    }
    handleReturnBook(returnModal.loan.borrow_qr_token, finalIssue);
  };

  const issueOptions = ["Missing/Lost", "Torn pages", "Water damage", "Vandalized", "Cover torn"];

  const overdueLoans = activeLoans.filter(l => isPast(new Date(l.due_date)) && l.status !== "returned" && l.status !== "not_returned");
  const dueTodayLoans = activeLoans.filter(l => isToday(new Date(l.due_date)) && l.status === "borrowed");
  const dueTomorrowLoans = activeLoans.filter(l => isTomorrow(new Date(l.due_date)) && l.status === "borrowed");
  const alertCount = overdueLoans.length + dueTodayLoans.length + dueTomorrowLoans.length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <Toaster position="top-right" />

      {/* Alert Banner */}
      {alertCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 w-5 h-5" />
            <span className="font-bold text-red-700">{overdueLoans.length} Overdue • {dueTodayLoans.length} Due Today • {dueTomorrowLoans.length} Due Tomorrow</span>
            <span className="text-sm text-red-700">The system will send SMS & email reminders on due date.</span>
          </div>
          <button onClick={() => setShowNotificationPanel(true)} className="bg-red-600 text-white px-3 py-1 rounded-xl flex items-center gap-1 text-sm">
            <Bell className="w-4 h-4" /> View All
          </button>
        </div>
      )}

      {/* Confirm Borrow QR Scanner */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-[#EBF0F7] rounded-xl flex items-center justify-center">
            <QrCode className="w-4 h-4 text-[#1B3A6B]" />
          </div>
          <div>
            <h3 className="text-[#1B3A6B] font-bold text-sm">Confirm Borrow QR</h3>
            <p className="text-gray-400 text-xs">Scan visitor's borrow QR to activate loan</p>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl w-full max-w-xs h-48 mx-auto overflow-hidden mb-3">
          <div id="confirm-scanner-container" ref={confirmScannerRef} className="w-full h-full"></div>
        </div>
        <div className="flex gap-2">
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

      {/* Active Loans Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[#1B3A6B] font-bold text-base">Active Loans</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search book or borrower..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-[#F5F7FA]">
              <tr>
                <th className="p-2 text-left">Book</th>
                <th>Borrower</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map(loan => {
                const due = new Date(loan.due_date);
                let statusText = "Borrowed", statusClass = "text-blue-600 bg-blue-50";
                if (loan.status === "returned") { statusText = "Returned"; statusClass = "text-green-600 bg-green-50"; }
                else if (loan.status === "not_returned") { statusText = "Not Returned"; statusClass = "text-red-600 bg-red-50 font-bold"; }
                else if (isPast(due)) { statusText = "Overdue"; statusClass = "text-red-600 bg-red-50 font-bold"; }
                else if (isToday(due)) { statusText = "Due Today"; statusClass = "text-orange-600 bg-orange-50 font-bold animate-pulse"; }
                else if (isTomorrow(due)) { statusText = "Due Tomorrow"; statusClass = "text-yellow-600 bg-yellow-50"; }
                return (
                  <tr key={loan._id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      {loan.book.title}
                      <div className="text-gray-400 text-[11px]">{loan.book.author}</div>
                      {loan.return_issues && <div className="text-red-500 text-[11px]">⚠ {loan.return_issues}</div>}
                    </td>
                    <td className="p-2">
                      {loan.visitor.name}
                      <div className="text-gray-400 text-[11px]">{loan.email}<br />{loan.phone}</div>
                    </td>
                    <td className="p-2">{format(due, "PPP")}</td>
                    <td className="p-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass}`}>{statusText}</span></td>
                    <td className="p-2 space-y-1">
                      {loan.status !== "returned" && loan.status !== "not_returned" && (
                        <>
                          <button onClick={() => openReturnModal(loan)} className="bg-blue-600 text-white text-[11px] px-2 py-1 rounded w-full">
                            Mark Returned
                          </button>
                          <button onClick={() => handleNotReturned(loan)} className="bg-red-600 text-white text-[11px] px-2 py-1 rounded w-full">
                            Not Returned
                          </button>
                        </>
                      )}
                      {!loan.reminder_sent && loan.status !== "returned" && loan.status !== "not_returned" && (
                        <button onClick={() => handleSendReminder(loan)} className="bg-orange-500 text-white text-[11px] px-2 py-1 rounded w-full flex items-center justify-center gap-1">
                          <Mail className="w-3 h-3" /> Remind
                        </button>
                      )}
                      {loan.reminder_sent && <span className="text-green-600 text-[11px] flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Reminder Sent</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredLoans.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-4">No active loans found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Panel (unchanged) */}
      {showNotificationPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-sm h-full shadow-xl flex flex-col">
            <div className="bg-red-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2"><Bell className="w-5 h-5" /> Due Date Alerts ({alertCount})</div>
              <button onClick={() => setShowNotificationPanel(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {overdueLoans.length > 0 && <div><div className="bg-red-50 p-2 font-bold text-red-700">🚨 OVERDUE</div>{overdueLoans.map(l => <div key={l._id} className="border-b py-2"><div className="font-medium">{l.book.title}</div><div>{l.visitor.name} | {l.email}<br />Due: {format(new Date(l.due_date), "PPP")}</div>{!l.reminder_sent ? <button onClick={() => handleSendReminder(l)} className="mt-1 bg-red-500 text-white text-xs px-2 py-1 rounded">Remind</button> : <span className="text-green-600 text-xs">✓ Sent</span>}</div>)}</div>}
              {dueTodayLoans.length > 0 && <div><div className="bg-orange-50 p-2 font-bold text-orange-700">⏰ DUE TODAY</div>{dueTodayLoans.map(l => <div key={l._id} className="border-b py-2"><div className="font-medium">{l.book.title}</div><div>{l.visitor.name} | {l.email}</div>{!l.reminder_sent ? <button onClick={() => handleSendReminder(l)} className="mt-1 bg-orange-500 text-white text-xs px-2 py-1 rounded">Remind</button> : <span className="text-green-600 text-xs">✓ Sent</span>}</div>)}</div>}
              {dueTomorrowLoans.length > 0 && <div><div className="bg-yellow-50 p-2 font-bold text-yellow-700">📅 DUE TOMORROW</div>{dueTomorrowLoans.map(l => <div key={l._id} className="border-b py-2"><div className="font-medium">{l.book.title}</div><div>{l.visitor.name} | {l.email}</div>{!l.reminder_sent ? <button onClick={() => handleSendReminder(l)} className="mt-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded">Remind</button> : <span className="text-green-600 text-xs">✓ Sent</span>}</div>)}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Return Modal with issue chips */}
      {returnModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Return: {returnModal.loan?.book.title}</h3>
              <button onClick={() => setReturnModal({ open: false, loan: null, issues: "" })}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Is there an issue with the returned book?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {issueOptions.map(issue => (
                <button
                  key={issue}
                  onClick={() => setSelectedIssue(issue)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selectedIssue === issue ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {issue}
                </button>
              ))}
              <button
                onClick={() => setSelectedIssue("custom")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${selectedIssue === "custom" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                Other (specify)
              </button>
            </div>
            {selectedIssue === "custom" && (
              <textarea
                value={customIssue}
                onChange={e => setCustomIssue(e.target.value)}
                placeholder="Please describe the issue..."
                rows={2}
                className="w-full border rounded-lg p-2 text-sm mb-3"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => setReturnModal({ open: false, loan: null, issues: "" })} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
              <button onClick={handleConfirmReturn} className="flex-1 bg-blue-600 text-white py-2 rounded">Confirm Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}