import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Users, Library, ChevronRight, Clock } from "lucide-react";
import logo from "../assets/logo.png";

export default function Landing() {
   const navigate = useNavigate();
   const [stats, setStats] = useState({
      visitorsToday: 0,
      availableBooks: 0,
      hours: "8:00 AM - 5:00 PM",
   });

   useEffect(() => {
      // Check if visitor already has stored data
      const stored = localStorage.getItem("visitor");
      if (stored) {
         navigate("/mobile/home", { replace: true });
         return;
      }
      fetch(`${import.meta.env.VITE_API_URL}/stats`)
         .then((res) => res.json())
         .then((data) =>
            setStats((prev) => ({
               ...prev,
               visitorsToday: data.visitorsToday,
               availableBooks: data.availableBooks,
            })),
         )
         .catch((err) => console.error(err));
   }, [navigate]);

   return (
      <>
         {/* Top Bar */}
         <div className="bg-[#1B3A6B] px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
               <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                  <img
                     src={logo}
                     alt="Logo"
                     className="w-12 h-12 object-contain"
                  />
               </div>
               <div>
                  <p className="text-blue-200 text-xs leading-none">
                     Polangui Municipal
                  </p>
                  <p className="text-white text-lg font-bold leading-snug">
                     LIBRARY
                  </p>
                  <p className="text-blue-200 text-xs">QR Management System</p>
               </div>
            </div>
         </div>

         {/* Hero Gradient */}
         <div className="bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] px-5 pt-6 pb-10 text-center relative">
            <h1 className="text-white text-2xl font-bold mb-2">
               Hi! Welcome! 👋
            </h1>
            <p className="text-blue-200 text-sm leading-relaxed max-w-xs mx-auto">
               To enter the library, please register your visit using the form.
               This system helps the library record visitor statistics and
               improve services.
            </p>
         </div>

         {/* Floating Stats Cards */}
         <div className="px-5 -mt-5 relative z-10">
            <div className="grid grid-cols-3 gap-3">
               <div className="bg-white rounded-xl p-3 text-center shadow-md border border-gray-100">
                  <Users className="w-5 h-5 mx-auto text-[#1B3A6B] mb-1" />
                  <div className="text-xl font-bold text-[#1B3A6B]">
                     {stats.visitorsToday}
                  </div>
                  <div className="text-xs text-gray-400">Visitors Today</div>
               </div>
               <div className="bg-white rounded-xl p-3 text-center shadow-md border border-gray-100">
                  <Library className="w-5 h-5 mx-auto text-[#1B3A6B] mb-1" />
                  <div className="text-xl font-bold text-[#1B3A6B]">
                     {stats.availableBooks}
                  </div>
                  <div className="text-xs text-gray-400">Books Available</div>
               </div>
               <div className="bg-white rounded-xl p-3 text-center shadow-md border border-gray-100">
                  <Clock className="w-5 h-5 mx-auto text-[#1B3A6B] mb-1" />
                  <div className="text-xs font-bold text-[#1B3A6B] leading-tight">
                     8-5 PM
                  </div>
                  <div className="text-xs text-gray-400">Hours Open</div>
               </div>
            </div>
         </div>

         {/* How it works card */}
         <div className="px-5 mt-5">
            <div className="bg-[#F0F4F8] rounded-2xl p-4">
               <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  How it works
               </h3>
               <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-3">
                     <span className="inline-flex items-center justify-center w-5 h-5 bg-white text-[#1B3A6B] rounded-full text-xs font-bold">
                        1
                     </span>
                     <span>Fill in your visitor information</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="inline-flex items-center justify-center w-5 h-5 bg-white text-[#1B3A6B] rounded-full text-xs font-bold">
                        2
                     </span>
                     <span>Generate your QR pass</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="inline-flex items-center justify-center w-5 h-5 bg-white text-[#1B3A6B] rounded-full text-xs font-bold">
                        3
                     </span>
                     <span>Scan at library entrance</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="inline-flex items-center justify-center w-5 h-5 bg-white text-[#1B3A6B] rounded-full text-xs font-bold">
                        4
                     </span>
                     <span>Enjoy library services</span>
                  </div>
               </div>
               <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-200">
                  Already have a pass? Your details are saved for your next
                  visit.
               </p>
            </div>
         </div>

         {/* Check-in Button */}
         <div className="px-5 mt-5 mb-6">
            <Link to="/mobile/checkin">
               <button className="w-full bg-[#1B3A6B] hover:bg-[#142d54] text-white font-semibold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition">
                  CHECK‑IN <ChevronRight className="w-4 h-4" />
               </button>
            </Link>
            <p className="text-center text-xs text-gray-400 mt-3">
               Walk-in • Borrow • Return
            </p>
         </div>
      </>
   );
}
