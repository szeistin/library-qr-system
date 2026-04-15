import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import QRCode from "qrcode";
import { Download, Home, User, Hash, Target, CheckCircle } from "lucide-react";

export default function QRPass() {
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("visitor");
    if (!stored) {
      navigate("/");
      return;
    }
    const data = JSON.parse(stored);
    setVisitor(data);
    QRCode.toDataURL(data.qr_url, (err, url) => {
      if (!err) setQrDataUrl(url);
    });
  }, [navigate]);

  const handleSaveQR = () => {
    const link = document.createElement("a");
    link.download = "library_qr.png";
    link.href = qrDataUrl;
    link.click();
  };

  if (!visitor) return <div className="p-4 text-center">Loading...</div>;

  return (
    <>
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div>
          <p className="text-white text-sm font-bold">QR VISITOR PASS</p>
          <p className="text-blue-200 text-xs">Present this QR code at the entrance</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {scanned && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-green-700 text-xs">Your visitor pass has been generated successfully!</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
            <div className="w-9 h-9 bg-[#1B3A6B] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[#1B3A6B] font-bold text-sm">{visitor.name}</p>
              <p className="text-gray-400 text-xs">{visitor.profession || "Visitor"}</p>
            </div>
          </div>

          <div className="bg-[#F5F7FA] rounded-xl py-4 mb-3">
            <div className="bg-white p-3 rounded-xl shadow-inner flex justify-center">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />}
            </div>
            <p className="text-[#1B3A6B] text-xs font-semibold text-center mt-2">Scan to Check-In / Check-Out</p>
          </div>

          <div className="bg-[#1B3A6B] rounded-xl p-3 flex justify-between items-center mb-3">
            <div>
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4 text-[#C9A227]" />
                <p className="text-blue-200 text-xs">Reference Number</p>
              </div>
              <p className="text-white font-bold text-lg tracking-widest">{visitor.reference_number}</p>
            </div>
            <div className="text-right">
              <p className="text-white text-xs">Use this number for</p>
              <p className="text-white text-xs font-semibold">Assisted Check-In</p>
            </div>
          </div>

          <div className="bg-[#F0F4F8] rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4 text-[#C9A227]" />
              <p className="text-gray-400 text-xs">Purpose</p>
            </div>
            <p className="text-[#1B3A6B] text-xs font-semibold">{visitor.purpose || "Study / Research"}</p>
          </div>
        </div>


        <div className="flex gap-3 mt-2">
          <button onClick={handleSaveQR} className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <Download className="w-4 h-4" /> Save QR
          </button>
          <Link to="/mobile/home" className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1">
            <Home className="w-4 h-4" /> Go to Home
          </Link>
        </div>
        <p className="text-center text-gray-400 text-xs mt-3">Save your QR code or note your reference number for future visits.</p>
      </div>
    </>
  );
}