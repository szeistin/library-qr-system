import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
   BookOpen,
   User,
   Edit3,
   Star,
   QrCode,
   ChevronRight,
   ChevronDown,
   CheckCircle,
} from "lucide-react";
import { getVisitorLoans } from "../api/api";

export default function VisitorHome() {
   const navigate = useNavigate();
   const [visitor, setVisitor] = useState(null);
   const [recommendedBooks, setRecommendedBooks] = useState([]);
   const [loadingRecs, setLoadingRecs] = useState(true);
   const [borrowedBooks, setBorrowedBooks] = useState([]);
   const [loadingLoans, setLoadingLoans] = useState(false);
   const [qrExpanded, setQrExpanded] = useState(false);
   const [qrDataUrl, setQrDataUrl] = useState("");

   useEffect(() => {
      const stored = localStorage.getItem("visitor");
      if (!stored) {
         navigate("/");
         return;
      }
      const v = JSON.parse(stored);
      setVisitor(v);
      if (v.qr_url) {
         import("qrcode").then((QRCode) => {
            QRCode.toDataURL(v.qr_url, (err, url) => {
               if (!err) setQrDataUrl(url);
            });
         });
      }
   }, [navigate]);

   useEffect(() => {
      if (visitor && visitor.id) {
         setLoadingLoans(true);
         getVisitorLoans(visitor.id)
            .then((data) => setBorrowedBooks(data))
            .catch((err) => console.error(err))
            .finally(() => setLoadingLoans(false));
      }
   }, [visitor]);

   useEffect(() => {
      if (visitor?.dob) {
         fetch(
            `${import.meta.env.VITE_API_URL}/books/recommended?dob=${visitor.dob}`,
         )
            .then((res) => res.json())
            .then((data) => setRecommendedBooks(data))
            .catch((err) => console.error(err))
            .finally(() => setLoadingRecs(false));
      }
   }, [visitor]);

   if (!visitor) return <div className="p-4 text-center">Loading...</div>;

   const age = visitor.dob
      ? new Date().getFullYear() - new Date(visitor.dob).getFullYear()
      : 0;
   const ageGroup =
      age >= 6 && age <= 12
         ? "Children"
         : age >= 13 && age <= 21
           ? "Adolescents"
           : age >= 22 && age <= 35
             ? "Young Adults"
             : "Adults";

   return (
      <>
         {/* Header Gradient */}
         <div className="bg-gradient-to-r from-[#1B3A6B] to-[#2a5298] px-4 pt-4 pb-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                     <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                     <p className="text-blue-200 text-xs">Welcome back,</p>
                     <p className="text-white font-bold text-sm">
                        {visitor.name.split(" ")[0]}
                     </p>
                  </div>
               </div>
               <button
                  onClick={() =>
                     navigate("/mobile/checkin", { state: { editMode: true } })
                  }
                  className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
               >
                  <Edit3 className="w-3 h-3" /> Edit Info
               </button>
            </div>
            <div className="flex gap-2 mt-3">
               <span className="bg-[#C9A227] text-white text-xs px-2 py-1 rounded-lg">
                  {ageGroup} ({age} yrs)
               </span>
               <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg">
                  {visitor.purpose || "Study / Research"}
               </span>
            </div>
         </div>

         <div className="px-4 py-4 space-y-4">
            {/* Expandable QR Visitor Pass Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <button
                  onClick={() => setQrExpanded(!qrExpanded)}
                  className="w-full p-4 flex items-center justify-between"
               >
                  <div className="flex items-center gap-2">
                     <QrCode className="w-5 h-5 text-[#1B3A6B]" />
                     <p className="text-[#1B3A6B] text-sm font-semibold">
                        My QR Visitor Pass
                     </p>
                     <p className="text-gray-400 text-xs">
                        {visitor.reference_number}
                     </p>
                  </div>
                  <ChevronDown
                     className={`w-4 h-4 text-gray-400 transition-transform ${qrExpanded ? "rotate-180" : ""}`}
                  />
               </button>
               {qrExpanded && (
                  <div className="border-t border-gray-100 bg-[#F5F7FA] p-4">
                     <div className="bg-white p-3 rounded-xl shadow-inner flex justify-center">
                        {qrDataUrl && (
                           <img
                              src={qrDataUrl}
                              alt="QR Code"
                              className="w-32 h-32"
                           />
                        )}
                     </div>
                     <p className="text-gray-400 text-xs text-center mt-2">
                        Scan to Check-In or Check-Out
                     </p>
                     <div className="bg-[#1B3A6B] rounded-xl px-6 py-2 text-center mt-3">
                        <p className="text-white font-bold tracking-widest text-base">
                           {visitor.reference_number}
                        </p>
                     </div>
                  </div>
               )}
            </div>

            {/* Borrow a Book Banner */}
            <Link to="/mobile/borrow">
               <div className="bg-[#1B3A6B] rounded-2xl p-4 shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                     </div>
                     <div>
                        <p className="text-white font-bold text-sm">
                           BORROW A BOOK
                        </p>
                        <p className="text-blue-200 text-xs">
                           Search and reserve books
                        </p>
                     </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/60" />
               </div>
            </Link>

            {/* Borrowing History Section (full history) */}
            <div>
               <h3 className="text-sm font-bold text-[#1B3A6B] mb-2">
                  Your borrowed book/s
               </h3>
               {loadingLoans ? (
                  <div className="text-center text-gray-400 text-sm">
                     Loading your history...
                  </div>
               ) : borrowedBooks.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm">
                     You haven't borrowed any books yet.
                  </div>
               ) : (
                  <div className="space-y-2">
                     {borrowedBooks.map((loan) => {
                        const due = new Date(loan.due_date);
                        const today = new Date();
                        let statusText = "";
                        let statusClass = "";
                        if (loan.status === "returned") {
                           statusText = "Returned";
                           statusClass = "bg-gray-100 text-gray-600";
                        } else if (due < today) {
                           statusText = "Overdue";
                           statusClass = "bg-red-100 text-red-600";
                        } else if (
                           due.toDateString() === today.toDateString()
                        ) {
                           statusText = "Due Today";
                           statusClass = "bg-orange-100 text-orange-600";
                        } else {
                           statusText = "Active";
                           statusClass = "bg-green-100 text-green-600";
                        }
                        return (
                           <div
                              key={loan._id}
                              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
                           >
                              <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-[#1B3A6B] text-xs font-bold">
                                       {loan.book.title}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                       {loan.book.author}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                       Borrowed:{" "}
                                       {new Date(
                                          loan.borrow_date,
                                       ).toLocaleDateString()}
                                    </p>
                                    {loan.status !== "returned" && (
                                       <p className="text-xs text-gray-500">
                                          Due: {due.toLocaleDateString()}
                                       </p>
                                    )}
                                    {loan.return_date && (
                                       <p className="text-xs text-gray-500">
                                          Returned:{" "}
                                          {new Date(
                                             loan.return_date,
                                          ).toLocaleDateString()}
                                       </p>
                                    )}
                                 </div>
                                 <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}
                                 >
                                    {statusText}
                                 </span>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

            {/* Recommended Books Section */}
            <div>
               <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 text-[#C9A227] fill-[#C9A227]" />
                  <p className="text-[#1B3A6B] text-sm font-bold">
                     Recommended for You
                  </p>
               </div>
               {loadingRecs ? (
                  <div className="text-sm text-gray-400">Loading...</div>
               ) : recommendedBooks.length === 0 ? (
                  <div className="text-sm text-gray-400">
                     No recommendations available.
                  </div>
               ) : (
                  <div className="space-y-2">
                     {recommendedBooks.slice(0, 3).map((book) => (
                        <div
                           key={book._id}
                           className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3"
                        >
                           <div className="w-10 h-12 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-white" />
                           </div>
                           <div className="flex-1">
                              <p className="text-[#1B3A6B] text-xs font-bold truncate">
                                 {book.title}
                              </p>
                              <p className="text-gray-400 text-xs">
                                 {book.author}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">
                                    {book.category}
                                 </span>
                                 <div className="flex items-center gap-0.5">
                                    <Star className="w-3 h-3 text-[#C9A227] fill-[#C9A227]" />
                                    <span className="text-xs text-gray-500">
                                       {book.borrowCount || 0} borrows
                                    </span>
                                 </div>
                              </div>
                           </div>
                           <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Available
                           </span>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </>
   );
}
