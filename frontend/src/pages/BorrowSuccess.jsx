import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { Download, Home, BookOpen, Calendar, Hash, CheckCircle, Copy } from "lucide-react";
import { toast } from "sonner";

export default function BorrowSuccess() {
  const [borrowInfo, setBorrowInfo] = useState(null);
  const [combinedQrUrl, setCombinedQrUrl] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("borrowInfo");
    if (!stored) {
      window.location.href = "/";
      return;
    }
    const info = JSON.parse(stored);
    setBorrowInfo(info);

    // Combine all tokens into one string (comma-separated)
    const tokens = info.borrow_qr_tokens || [info.borrow_qr_token];
    const combinedTokens = tokens.join(",");
    const qrData = combinedTokens; // encode the combined tokens directly

    QRCode.toDataURL(qrData, (err, url) => {
      if (!err) setCombinedQrUrl(url);
    });
  }, []);

  const handleSaveQR = () => {
    const link = document.createElement("a");
    link.download = "borrow_batch_qr.png";
    link.href = combinedQrUrl;
    link.click();
  };

  const copyCombinedToken = () => {
    if (borrowInfo) {
      const tokens = borrowInfo.borrow_qr_tokens || [borrowInfo.borrow_qr_token];
      const combined = tokens.join(",");
      navigator.clipboard.writeText(combined);
      toast.success("Combined token copied to clipboard");
    }
  };

  if (!borrowInfo) return <div className="p-4 text-center">Loading...</div>;

  const borrowDate = new Date(borrowInfo.borrowDate);
  const dueDate = new Date(borrowInfo.dueDate);
  const books = borrowInfo.books || [borrowInfo.book];
  const tokens = borrowInfo.borrow_qr_tokens || [borrowInfo.borrow_qr_token];
  const combinedToken = tokens.join(",");

  return (
    <>
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div>
          <p className="text-white text-sm font-bold">BORROW QR CODE (BATCH)</p>
          <p className="text-blue-200 text-xs">One QR for all {books.length} book(s)</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700 text-xs">
            {books.length} book{books.length > 1 ? "s" : ""} borrowed successfully!
          </p>
        </div>

        {/* Single QR code for all books */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-[#C9A227] px-4 py-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-white" />
            <p className="text-white text-xs font-bold tracking-wide">BATCH QR (SCAN ONCE)</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-[#F5F7FA] rounded-xl py-4">
              <div className="bg-white p-3 rounded-xl shadow-inner flex justify-center">
                {combinedQrUrl && <img src={combinedQrUrl} alt="Batch QR" className="w-36 h-36" />}
              </div>
            </div>

            <div className="bg-[#1B3A6B] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4 text-[#C9A227]" />
                  <p className="text-blue-200 text-xs">Combined Token (all books)</p>
                </div>
                <button
                  onClick={copyCombinedToken}
                  className="text-white bg-blue-700 rounded-lg px-2 py-1 text-xs flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-white font-mono text-xs break-all">{combinedToken}</p>
            </div>

            <button
              onClick={handleSaveQR}
              className="w-full bg-white border border-gray-200 text-gray-600 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Download className="w-3 h-3" /> Save Batch QR
            </button>
          </div>
        </div>

        {/* List of borrowed books (optional summary) */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-[#1B3A6B] px-4 py-2">
            <p className="text-white text-xs font-bold tracking-wide">BORROWED BOOKS</p>
          </div>
          <div className="p-4 space-y-2">
            {books.map((book, idx) => (
              <div key={book._id || idx} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-8 h-10 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-[#1B3A6B] text-xs font-bold">{book.title}</p>
                  <p className="text-gray-400 text-xs">{book.author}</p>
                </div>
                <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">{book.category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Borrow & due dates */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-[#1B3A6B] px-4 py-2">
            <p className="text-white text-xs font-bold tracking-wide">DATES</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#EBF0F7] rounded-xl p-2.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1B3A6B]" />
                <div>
                  <p className="text-gray-400 text-xs">Borrow Date</p>
                  <p className="text-[#1B3A6B] font-semibold text-xs">{borrowDate.toLocaleDateString()}</p>
                </div>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-gray-400 text-xs">Due Date</p>
                  <p className="text-red-600 font-semibold text-xs">{dueDate.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <span className="text-lg">📧</span>
              <div>
                <p className="text-blue-700 text-xs font-bold">Reminder will be sent!</p>
                <p className="text-blue-600 text-xs">An Email reminder will be sent to {borrowInfo.email} on {dueDate.toLocaleDateString()}.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/mobile/borrow" className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <BookOpen className="w-4 h-4" /> Borrow More
          </Link>
          <Link to="/mobile/home" className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}