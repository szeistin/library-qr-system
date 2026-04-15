import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginStaff, registerStaff } from "../api/api";
import { User, Lock, Shield, Eye, EyeOff, ChevronLeft } from "lucide-react";
import logo from "../assets/logo.png";

const positionOptions = [
   "Head Librarian",
   "Librarian",
   "Assistant Librarian",
   "Library Staff",
   "Administrator",
];

export default function AdminLogin() {
   const navigate = useNavigate();
   const [isRegister, setIsRegister] = useState(false);
   const [username, setUsername] = useState("");
   const [position, setPosition] = useState("");
   const [pin, setPin] = useState("");
   const [confirmPin, setConfirmPin] = useState("");
   const [showPin, setShowPin] = useState(false);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");

   const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
         const data = await loginStaff(username, pin);
         localStorage.setItem("token", data.token);
         localStorage.setItem("staff", JSON.stringify(data.staff));
         navigate("/admin/dashboard");
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   const handleRegister = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      if (pin !== confirmPin) {
         setError("PINs do not match");
         setLoading(false);
         return;
      }
      try {
         await registerStaff(username, position, pin, confirmPin);
         setIsRegister(false);
         setError("Registration successful. Please login.");
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d2137] via-[#1B3A6B] to-[#2a5298] flex items-center justify-center p-6">
         <div className="w-full max-w-sm">
            {/* Logo Section */}
            <div className="text-center mb-8">
               <div className="w-20 h-20 rounded-2xl bg-[#C9A227] shadow-2xl flex items-center justify-center mx-auto mb-4">
                  <img
                     src={logo}
                     alt="Logo"
                     className="w-full h-full object-contain p-2"
                  />
               </div>
               <h1 className="text-white text-xl font-bold">
                  Polangui Municipal Library
               </h1>
               <p className="text-blue-200 text-sm mt-1">
                  QR‑Based Library Management System
               </p>
               <div className="inline-flex items-center gap-1 bg-white/10 text-white text-xs px-3 py-1.5 rounded-full mt-3">
                  <Shield className="w-3 h-3" /> Admin Access Only
               </div>
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
               <div className="mb-5">
                  <h2 className="text-[#1B3A6B] font-bold text-base">
                     {isRegister ? "Create Staff Account" : "Staff Sign In"}
                  </h2>
                  <p className="text-gray-400 text-xs">
                     {isRegister
                        ? "Register a new staff account."
                        : "Enter your credentials to access the system."}
                  </p>
               </div>

               <form
                  onSubmit={isRegister ? handleRegister : handleLogin}
                  className="space-y-4"
               >
                  {/* Username */}
                  <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                     />
                  </div>

                  {/* Position (only on register) */}
                  {isRegister && (
                     <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select
                           value={position}
                           onChange={(e) => setPosition(e.target.value)}
                           required
                           className="w-full border border-gray-200 rounded-xl pl-10 pr-3 py-3 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                        >
                           <option value="">Select Position</option>
                           {positionOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                 {opt}
                              </option>
                           ))}
                        </select>
                     </div>
                  )}

                  {/* PIN */}
                  <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                     <input
                        type={showPin ? "text" : "password"}
                        placeholder="PIN (4 digits)"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.slice(0, 4))}
                        required
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                     />
                     <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                     >
                        {showPin ? (
                           <EyeOff className="w-4 h-4" />
                        ) : (
                           <Eye className="w-4 h-4" />
                        )}
                     </button>
                  </div>

                  {/* Confirm PIN (only on register) */}
                  {isRegister && (
                     <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                           type={showPin ? "text" : "password"}
                           placeholder="Confirm PIN"
                           value={confirmPin}
                           onChange={(e) =>
                              setConfirmPin(e.target.value.slice(0, 4))
                           }
                           required
                           className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                        />
                     </div>
                  )}

                  {error && (
                     <div
                        className={`text-sm p-2 rounded-lg ${error.includes("successful") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}
                     >
                        {error}
                     </div>
                  )}

                  <button
                     type="submit"
                     disabled={loading}
                     className="w-full bg-[#1B3A6B] hover:bg-[#142d54] text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                     {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                     ) : isRegister ? (
                        "Create Account & Sign In"
                     ) : (
                        "Sign In"
                     )}
                  </button>
               </form>

               <div className="border-t border-gray-100 mt-4 pt-4 text-center">
                  {!isRegister && (
                     <button
                        onClick={() => {
                           setIsRegister(true);
                           setError("");
                        }}
                        className="text-xs text-[#1B3A6B] underline"
                     >
                        First time? Register here
                     </button>
                  )}
               </div>
            </div>

            <div className="text-center mt-4">
               <Link
                  to="/"
                  className="text-blue-200 text-xs hover:text-white transition inline-flex items-center gap-1"
               >
                  <ChevronLeft className="w-3 h-3" /> Back to Selector
               </Link>
            </div>
         </div>
      </div>
   );
}
