import { useState } from "react";
import { Lock, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function PinModal({
   isOpen,
   onClose,
   onSuccess,
   title = "PIN Required",
}) {
   const [pin, setPin] = useState("");
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
         const res = await fetch(`${API_URL}/staff/verify-pin`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ pin }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Verification failed");
         onSuccess();
         onClose();
         setPin("");
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#1B3A6B]" />
                  <h2 className="text-lg font-bold text-[#1B3A6B]">{title}</h2>
               </div>
               <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
               >
                  <X className="w-5 h-5" />
               </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
               Please enter your 4-digit PIN to access this page.
            </p>
            <form onSubmit={handleSubmit}>
               <input
                  type="password"
                  maxLength={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] mb-4"
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  autoFocus
               />
               {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
               <div className="flex gap-3">
                  <button
                     type="button"
                     onClick={onClose}
                     className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200"
                  >
                     Cancel
                  </button>
                  <button
                     type="submit"
                     disabled={loading || pin.length !== 4}
                     className="flex-1 bg-[#1B3A6B] text-white py-2 rounded-xl hover:bg-[#142d54] disabled:opacity-50"
                  >
                     {loading ? "Verifying..." : "Verify PIN"}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}
