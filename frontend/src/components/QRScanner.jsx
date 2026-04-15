import { useState } from "react";
import { Scan, UserCheck, UserX } from "lucide-react";

export default function QRScanner({ onCheckInOut }) {
   const [qrToken, setQrToken] = useState("");
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState("");

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!qrToken.trim()) return;
      setLoading(true);
      setMessage("");
      try {
         const res = await onCheckInOut(qrToken);
         setMessage(res.message);
         setQrToken("");
      } catch (err) {
         setMessage(err.message);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div>
         <form onSubmit={handleSubmit} className="mb-4">
            <label className="block text-sm font-medium mb-1">
               Scan QR or enter token
            </label>
            <div className="flex gap-2">
               <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="Paste QR token or reference number"
                  className="flex-1 bg-input-background border border-border rounded-lg px-3 py-2 text-sm"
               />
               <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg"
               >
                  {loading ? "..." : <Scan className="w-4 h-4" />}
               </button>
            </div>
         </form>
         {message && (
            <div className="text-sm p-2 rounded bg-secondary">{message}</div>
         )}
      </div>
   );
}
