import { Link } from "react-router-dom";
import { Smartphone, Monitor } from "lucide-react";
import logo from "../assets/logo.png";

export default function SystemChooser() {
   return (
      <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-6">
         <div className="max-w-2xl w-full">
            {/* Library Identity Header */}
            <div className="flex flex-col items-center mb-10">
               <div className="flex items-center gap-3 mb-3">
                  {/* Logo Badge - navy square with logo image */}
                  <div className="w-16 h-16 rounded-2xl bg-[#1B3A6B] shadow-lg flex items-center justify-center">
                     <img
                        src={logo}
                        alt="Logo"
                        className="w-10 h-10 object-contain"
                     />
                  </div>
                  <div>
                     <p className="text-[#1B3A6B] text-sm tracking-widest uppercase">
                        Polangui Municipal
                     </p>
                     <p className="text-[#1B3A6B] text-xl font-bold tracking-wide">
                        LIBRARY
                     </p>
                  </div>
               </div>
               <h1 className="text-[#1B3A6B] text-2xl font-bold text-center mt-2">
                  QR-Based Library Management System
               </h1>
               <p className="text-gray-500 text-sm text-center mt-1">
                  Choose a system to preview
               </p>
               <div className="flex items-center gap-2 mt-2">
                  <span className="bg-[#C9A227] text-white text-xs px-3 py-1 rounded-full">
                     BSIS Capstone
                  </span>
                  <span className="bg-[#1B3A6B] text-white text-xs px-3 py-1 rounded-full">
                     Polangui, Albay
                  </span>
               </div>
            </div>

            {/* Choice Cards */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
               {/* Visitor Mobile Card */}
               <Link to="/mobile" className="flex-1 group">
                  <div className="bg-white rounded-2xl p-8 shadow-md border-2 border-transparent hover:border-[#1B3A6B] hover:shadow-xl transition-all cursor-pointer text-left">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-[#EBF0F7] rounded-xl flex items-center justify-center group-hover:bg-[#1B3A6B] transition-colors">
                           <Smartphone className="w-6 h-6 text-[#1B3A6B] group-hover:text-white transition-colors" />
                        </div>
                        <div>
                           <p className="text-[#1B3A6B] font-bold">
                              VISITOR MOBILE SYSTEM
                           </p>
                           <p className="text-gray-400 text-xs">
                              Phone / Tablet
                           </p>
                        </div>
                     </div>
                     <p className="text-gray-600 text-sm leading-relaxed">
                        Visitor-facing mobile website for check-in, QR visitor
                        pass generation, book borrowing, and QR borrow pass.
                     </p>
                     <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Visitor Registration & QR Pass
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Book Search & Borrow
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Recommended Books
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Check-in / Check-out
                           </span>
                        </div>
                     </div>
                     <div className="mt-5 text-[#1B3A6B] font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                        Open Mobile <span>→</span>
                     </div>
                  </div>
               </Link>

               {/* Admin Web Card */}
               <Link to="/admin" className="flex-1 group">
                  <div className="bg-white rounded-2xl p-8 shadow-md border-2 border-transparent hover:border-[#1B3A6B] hover:shadow-xl transition-all cursor-pointer text-left">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-[#EBF0F7] rounded-xl flex items-center justify-center group-hover:bg-[#1B3A6B] transition-colors">
                           <Monitor className="w-6 h-6 text-[#1B3A6B] group-hover:text-white transition-colors" />
                        </div>
                        <div>
                           <p className="text-[#1B3A6B] font-bold">
                              ADMIN WEB SYSTEM
                           </p>
                           <p className="text-gray-400 text-xs">
                              Desktop / Laptop
                           </p>
                        </div>
                     </div>
                     <p className="text-gray-600 text-sm leading-relaxed">
                        Staff dashboard for visitor management, QR scanning,
                        borrowing tracking, demographic reports, and due date
                        reminders.
                     </p>
                     <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Dashboard & Demographics
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              QR Scanner & Check-in
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Borrowing & Returns
                           </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-[#C9A227] rounded-full"></div>
                           <span className="text-gray-500 text-xs">
                              Accomplishment Reports
                           </span>
                        </div>
                     </div>
                     <div className="mt-5 text-[#1B3A6B] font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                        Open Admin <span>→</span>
                     </div>
                  </div>
               </Link>
            </div>
         </div>
      </div>
   );
}
