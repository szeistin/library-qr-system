import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { Download, Home, BookOpen, Calendar, Hash, CheckCircle } from "lucide-react";

export default function BorrowSuccess() {
  const [borrowInfo, setBorrowInfo] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("borrowInfo");
    if (!stored) {
      window.location.href = "/";
      return;
    }
    const info = JSON.parse(stored);
    setBorrowInfo(info);
    const qrUrl = `${import.meta.env.VITE_API_URL}/loans/qr/${info.borrow_qr_token}`;
    QRCode.toDataURL(qrUrl, (err, url) => {
      if (!err) setQrDataUrl(url);
    });
  }, []);

  const handleSaveQR = () => {
    const link = document.createElement("a");
    link.download = "borrow_qr.png";
    link.href = qrDataUrl;
    link.click();
  };

  if (!borrowInfo) return <div className="p-4 text-center">Loading...</div>;

  const borrowDate = new Date(borrowInfo.borrowDate);
  const dueDate = new Date(borrowInfo.dueDate);

  return (
    <>
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div>
          <p className="text-white text-sm font-bold">BORROW QR CODE</p>
          <p className="text-blue-200 text-xs">Present this code to the librarian/staff</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700 text-xs">Book borrow request submitted successfully!</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-[#C9A227] px-4 py-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-white" />
            <p className="text-white text-xs font-bold tracking-wide">LIBRARY BORROW PASS</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-[#F5F7FA] rounded-xl py-4">
              <div className="bg-white p-3 rounded-xl shadow-inner flex justify-center">
                {qrDataUrl && <img src={qrDataUrl} alt="Borrow QR" className="w-36 h-36" />}
              </div>
            </div>

            <div className="bg-[#EBF0F7] rounded-xl p-2.5 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1B3A6B]" />
              <div>
                <p className="text-[#1B3A6B] text-xs font-bold">{borrowInfo.book.title}</p>
                <p className="text-gray-400 text-xs">{borrowInfo.book.author}</p>
              </div>
            </div>

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

            <div className="bg-[#1B3A6B] rounded-xl p-3 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4 text-[#C9A227]" />
                  <p className="text-blue-200 text-xs">Borrow ID</p>
                </div>
                <p className="text-white font-bold text-sm tracking-wide">{borrowInfo.borrow_qr_token.slice(0, 8)}</p>
              </div>
              <p className="text-white text-xs font-semibold">{borrowInfo.book.borrowerName || "Visitor"}</p>
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

        <div className="flex gap-3">
          <button onClick={handleSaveQR} className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <Download className="w-4 h-4" /> Save QR
          </button>
          <Link to="/mobile/home" className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}