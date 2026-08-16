import { useState, useEffect } from "react";
import { Lock, X, AlertTriangle, CheckCircle2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function PinModal({
   isOpen,
   onClose,
   onSuccess,
   title = "PIN Verification Required",
   description, // e.g., "Are you sure you want to suspend John Doe?"
   confirmText = "Confirm Action",
   variant = "primary", // "danger" for suspend/block, "success" for unblock
}) {
   const [pin, setPin] = useState("");
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!isOpen) {
         setPin("");
         setError("");
      }
   }, [isOpen]);

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
         if (!res.ok) throw new Error(data.error || "PIN verification failed.");

         // Trigger action after successful PIN check
         await onSuccess();
         onClose();
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   if (!isOpen) return null;

   const isDanger = variant === "danger";
   const isSuccess = variant === "success";

   return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2">
                  {isDanger ? (
                     <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : isSuccess ? (
                     <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                     <Lock className="w-5 h-5 text-[#1B3A6B]" />
                  )}
                  <h2 className="text-lg font-bold text-gray-900">{title}</h2>
               </div>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
               </button>
            </div>

            {/* Confirmation Question */}
            {description && (
               <div className={`p-3 rounded-xl mb-4 text-xs font-semibold ${
                  isDanger ? "bg-red-50 text-red-800" : isSuccess ? "bg-green-50 text-green-800" : "bg-blue-50 text-[#1B3A6B]"
               }`}>
                  {description}
               </div>
            )}

            <p className="text-xs text-gray-500 mb-3">
               Enter your 4-digit staff PIN to authorize this action:
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
               <input
                  type="password"
                  maxLength={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] mb-3"
                  placeholder="****"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  autoFocus
               />

               {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

               <div className="flex gap-3">
                  <button
                     type="button"
                     onClick={onClose}
                     className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-semibold hover:bg-gray-200"
                  >
                     Cancel
                  </button>
                  <button
                     type="submit"
                     disabled={loading || pin.length !== 4}
                     className={`flex-1 text-white py-2 rounded-xl text-xs font-semibold disabled:opacity-50 ${
                        isDanger 
                           ? "bg-red-600 hover:bg-red-700" 
                           : isSuccess 
                           ? "bg-green-600 hover:bg-green-700" 
                           : "bg-[#1B3A6B] hover:bg-[#142d54]"
                     }`}
                  >
                     {loading ? "Authorizing..." : confirmText}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}