import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
   BookOpen,
   User,
   Edit3,
   Star,
   QrCode,
   ChevronDown,
   ChevronRight,
   LogOut,
   AlertTriangle,
   Lock,
} from "lucide-react";
import { getVisitorLoans, getRecommendedBooks } from "../api/api";

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
      if (visitor?.id) {
         setLoadingLoans(true);
         getVisitorLoans(visitor.id)
            .then((data) => setBorrowedBooks(data || []))
            .catch((err) => console.error("Loans fetch error:", err))
            .finally(() => setLoadingLoans(false));
      }
   }, [visitor]);

   useEffect(() => {
      if (visitor?.dob) {
         getRecommendedBooks(visitor.dob)
            .then((data) => {
               const sorted = [...(data || [])].sort((a, b) =>
                  a.title.localeCompare(b.title),
               );
               setRecommendedBooks(sorted);
            })
            .catch((err) => console.error("Recommendations fetch error:", err))
            .finally(() => setLoadingRecs(false));
      }
   }, [visitor]);

   const handleSignOut = () => {
      localStorage.removeItem("visitor");
      navigate("/");
   };

   if (!visitor)
      return <div className="p-4 text-center text-gray-500">Loading...</div>;

   // Exact age calculation
   const getExactAge = (dobString) => {
      if (!dobString) return 0;
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
         monthDiff < 0 ||
         (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
         age--;
      }
      return age;
   };

   const age = getExactAge(visitor.dob);
   const ageGroup =
      age >= 6 && age <= 12
         ? "Children"
         : age >= 13 && age <= 21
           ? "Adolescents"
           : age >= 22 && age <= 35
             ? "Young Adults"
             : "Adults";

   // Account Blocking Logic Condition
   const todayZero = new Date().setHours(0, 0, 0, 0);
   const hasUnretrievedOrOverdue = borrowedBooks.some((loan) => {
      const dueZero = new Date(loan.due_date).setHours(0, 0, 0, 0);
      return (
         loan.status === "unretrieved" ||
         loan.status === "overdue" ||
         (loan.status !== "returned" && dueZero < todayZero)
      );
   });

   const isBlocked =
      visitor.status === "blocked" ||
      visitor.is_blocked === true ||
      hasUnretrievedOrOverdue;

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
                        {visitor.name ? visitor.name.split(" ")[0] : "Visitor"}
                     </p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button
                     onClick={() =>
                        navigate("/mobile/checkin", {
                           state: { editMode: true },
                        })
                     }
                     className="bg-white/10 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                     <Edit3 className="w-3 h-3" /> Edit Info
                  </button>
                  <button
                     onClick={handleSignOut}
                     className="bg-red-500/80 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                     <LogOut className="w-3 h-3" /> Sign Out
                  </button>
               </div>
            </div>
            <div className="flex gap-2 mt-3 items-center">
               <span className="bg-[#C9A227] text-white text-xs px-2 py-1 rounded-lg">
                  {ageGroup} ({age} yrs)
               </span>
               <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg">
                  {visitor.purpose || "Study / Research"}
               </span>
               {isBlocked && (
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                     <Lock className="w-3 h-3" /> Restricted
                  </span>
               )}
            </div>
         </div>

         <div className="px-4 py-4 space-y-4">
            {/* Account Blocked Warning Banner */}
            {isBlocked && (
               <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-red-800 text-xs font-bold">
                        Account Restricted
                     </p>
                     <p className="text-red-700 text-xs mt-0.5">
                        Your account is currently restricted from borrowing new
                        books due to unretrieved reservations or overdue loans.
                        Please contact library staff to unblock your account.
                     </p>
                  </div>
               </div>
            )}

            {/* QR Pass Card */}
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
                     className={`w-4 h-4 text-gray-400 transition-transform ${
                        qrExpanded ? "rotate-180" : ""
                     }`}
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

            {/* Borrow Banner (Disabled if blocked) */}
            {isBlocked ? (
               <div className="bg-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between opacity-75 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gray-400/30 rounded-xl flex items-center justify-center">
                        <Lock className="w-5 h-5 text-gray-600" />
                     </div>
                     <div>
                        <p className="text-gray-700 font-bold text-sm">
                           BORROWING DISABLED
                        </p>
                        <p className="text-gray-500 text-xs">
                           Resolve overdue books to continue
                        </p>
                     </div>
                  </div>
               </div>
            ) : (
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
            )}

            {/* Borrowed Books History */}
            <div>
               <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-[#1B3A6B]">
                     Your borrowed books
                  </h3>
                  <Link
                     to="/mobile/history"
                     className="text-xs text-blue-600 font-medium"
                  >
                     View Full History →
                  </Link>
               </div>
               {loadingLoans ? (
                  <div className="text-center text-gray-400 text-sm py-2">
                     Loading your history...
                  </div>
               ) : borrowedBooks.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-2">
                     You haven't borrowed any books yet.
                  </div>
               ) : (
                  <div className="space-y-2">
                     {borrowedBooks.slice(0, 3).map((loan) => {
                        const due = new Date(loan.due_date);
                        const dueZero = new Date(due).setHours(0, 0, 0, 0);

                        let statusText = "";
                        let statusClass = "";

                        if (loan.status === "returned") {
                           statusText = "Returned";
                           statusClass = "bg-gray-100 text-gray-600";
                        } else if (loan.status === "unretrieved") {
                           statusText = "Unretrieved (Blocked)";
                           statusClass = "bg-red-100 text-red-700 font-bold";
                        } else if (
                           dueZero < todayZero ||
                           loan.status === "overdue"
                        ) {
                           statusText = "Overdue";
                           statusClass = "bg-red-100 text-red-600 font-bold";
                        } else if (dueZero === todayZero) {
                           statusText = "Due Today";
                           statusClass = "bg-orange-100 text-orange-600";
                        } else {
                           statusText = "Active";
                           statusClass = "bg-green-100 text-green-600";
                        }

                        return (
                           <div
                              key={loan._id}
                              className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex justify-between items-start"
                           >
                              <div>
                                 <p className="text-[#1B3A6B] text-xs font-bold">
                                    {loan.book?.title || "Unknown Book"}
                                 </p>
                                 <p className="text-gray-400 text-xs">
                                    {loan.book?.author || "Unknown Author"}
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
                              </div>
                              <span
                                 className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}
                              >
                                 {statusText}
                              </span>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

            {/* Recommended Books */}
            <div>
               <div className="flex items-center gap-1 mb-2">
                  <Star className="w-4 h-4 text-[#C9A227] fill-[#C9A227]" />
                  <p className="text-[#1B3A6B] text-sm font-bold">
                     Recommended for You
                  </p>
               </div>
               {loadingRecs ? (
                  <div className="text-sm text-gray-400 py-2">Loading...</div>
               ) : recommendedBooks.length === 0 ? (
                  <div className="text-sm text-gray-400 py-2">
                     No recommendations available.
                  </div>
               ) : (
                  <div className="space-y-2">
                     {/* Recommended Books List */}
                     {recommendedBooks.slice(0, 3).map((book) => (
                        <div
                           key={book._id}
                           onClick={() => {
                              if (!isBlocked) {
                                 navigate("/mobile/borrow", {
                                    state: {
                                       tab: "recommendations",
                                       selectedBook: book,
                                    },
                                 });
                              }
                           }}
                           className={`bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center gap-3 transition-all ${
                              isBlocked
                                 ? "opacity-60 cursor-not-allowed"
                                 : "cursor-pointer hover:border-blue-300 hover:shadow-md"
                           }`}
                        >
                           <div className="w-10 h-12 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center shrink-0">
                              <BookOpen className="w-5 h-5 text-white" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[#1B3A6B] text-xs font-bold truncate">
                                 {book.title}
                              </p>
                              <p className="text-gray-400 text-xs truncate">
                                 {book.author}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">
                                    {book.category}
                                 </span>
                              </div>
                           </div>
                           <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
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
