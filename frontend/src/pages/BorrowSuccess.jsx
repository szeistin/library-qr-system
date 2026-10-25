import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Home, BookOpen, Copy, Check } from "lucide-react";

export default function BorrowSuccess() {
  const navigate = useNavigate();
  const [info] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("borrowInfo") || "null");
    } catch {
      return null;
    }
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // No borrow info means nothing to show: go home (not back to the borrow page)
    if (!info) navigate("/mobile/home", { replace: true });
  }, [info, navigate]);

  if (!info) return null;

  const tokens = info.borrow_qr_tokens || [];
  // Comma-joined tokens: the admin scanner reads this fine
  const combinedToken = tokens.join(",");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(combinedToken);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = combinedToken;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Header (no back arrow, so the visitor cannot go back to borrow more) */}
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div>
          <p className="text-white text-sm font-bold">SHOW THIS QR TO STAFF</p>
          <p className="text-blue-200 text-xs">
            {info.books.length} book{info.books.length > 1 ? "s" : ""} to borrow
          </p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* QR */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center shadow-sm border border-gray-100">
          <QRCodeSVG value={combinedToken} size={220} level="L" />
          <p className="text-xs text-gray-500 mt-4 text-center">
            Staff will scan this QR to confirm your borrow.
          </p>

          {/* QR Token display */}
          <div className="w-full mt-4 bg-[#F5F7FA] rounded-xl p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">
                QR Token
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-[#1B3A6B] font-semibold hover:text-blue-900"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <p className="font-mono text-[11px] text-gray-700 break-all leading-snug">
              {combinedToken}
            </p>
          </div>
        </div>

        {/* Books */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs uppercase tracking-wide">BOOKS</p>
          <div className="space-y-2 mt-2">
            {info.books.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 py-2 border-b last:border-0"
              >
                <div className="w-8 h-10 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[#1B3A6B] text-xs font-bold">{b.title}</p>
                  <p className="text-gray-400 text-xs">{b.author}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#F0F4F8] rounded-xl p-2.5 mt-3 text-center">
            <p className="text-[#1B3A6B] font-bold text-sm">
              Due: {new Date(info.dueDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-lg">📱</span>
          <div>
            <p className="text-blue-700 text-xs font-semibold">
              Please show this QR to the library staff.
            </p>
            <p className="text-blue-600 text-xs">
              Your borrow will only be recorded after staff scans this QR.
            </p>
          </div>
        </div>

        {/* Only one way out: home (no "Borrow More") */}
        <div className="pt-2">
          <button
            onClick={() => navigate("/mobile/home", { replace: true })}
            className="w-full bg-[#1B3A6B] text-white py-3 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:bg-blue-900 transition"
          >
            <Home className="w-4 h-4" /> Go to Home
          </button>
        </div>
      </div>
    </>
  );
}