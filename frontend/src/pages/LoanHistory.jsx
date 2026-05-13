import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
   ArrowLeft,
   BookOpen,
   Calendar,
   CheckCircle,
   XCircle,
   AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { getVisitorLoans } from "../api/api";

export default function LoanHistory() {
   const navigate = useNavigate();
   const [loans, setLoans] = useState([]);
   const [loading, setLoading] = useState(true);
   const [visitor, setVisitor] = useState(null);

   useEffect(() => {
      const stored = localStorage.getItem("visitor");
      if (!stored) {
         navigate("/");
         return;
      }
      const v = JSON.parse(stored);
      setVisitor(v);
      getVisitorLoans(v.id)
         .then((data) => setLoans(data))
         .catch((err) => console.error(err))
         .finally(() => setLoading(false));
   }, [navigate]);

   if (loading) return <div className="p-4 text-center">Loading...</div>;

   return (
      <div className="min-h-screen bg-[#F5F7FA]">
         <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
               <button
                  onClick={() => navigate(-1)}
                  className="text-white/70 hover:text-white"
               >
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <div>
                  <p className="text-white text-sm font-bold">
                     Borrowing History
                  </p>
                  <p className="text-blue-200 text-xs">
                     All books you have borrowed
                  </p>
               </div>
            </div>
         </div>

         <div className="p-4 space-y-3">
            {loans.length === 0 ? (
               <div className="text-center text-gray-500 py-8">
                  No borrowing history.
               </div>
            ) : (
               loans.map((loan) => {
                  const dueDate = new Date(loan.due_date);
                  const borrowDate = new Date(loan.borrow_date);
                  const isReturned = loan.status === "returned";
                  const isOverdue = !isReturned && dueDate < new Date();
                  const isDueToday =
                     !isReturned &&
                     dueDate.toDateString() === new Date().toDateString();
                  let statusText = "Active";
                  let statusIcon = (
                     <BookOpen className="w-4 h-4 text-blue-600" />
                  );
                  if (isReturned) {
                     statusText = "Returned";
                     statusIcon = (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                     );
                  } else if (isOverdue) {
                     statusText = "Overdue";
                     statusIcon = <XCircle className="w-4 h-4 text-red-600" />;
                  } else if (isDueToday) {
                     statusText = "Due Today";
                     statusIcon = (
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                     );
                  }
                  return (
                     <div
                        key={loan._id}
                        className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
                     >
                        <div className="flex justify-between items-start">
                           <div className="flex-1">
                              <p className="text-[#1B3A6B] text-sm font-bold">
                                 {loan.book.title}
                              </p>
                              <p className="text-gray-500 text-xs">
                                 {loan.book.author}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                 <Calendar className="w-3 h-3 text-gray-400" />
                                 <span>
                                    Borrowed:{" "}
                                    {format(borrowDate, "MMM d, yyyy")}
                                 </span>
                              </div>
                              {!isReturned && (
                                 <div className="flex items-center gap-2 mt-1 text-xs">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span>
                                       Due: {format(dueDate, "MMM d, yyyy")}
                                    </span>
                                 </div>
                              )}
                              {loan.return_date && (
                                 <div className="flex items-center gap-2 mt-1 text-xs text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>
                                       Returned:{" "}
                                       {format(
                                          new Date(loan.return_date),
                                          "MMM d, yyyy",
                                       )}
                                    </span>
                                 </div>
                              )}
                              {loan.return_issues && (
                                 <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {loan.return_issues}
                                 </div>
                              )}
                           </div>
                           <div className="flex items-center gap-1 text-xs font-medium">
                              {statusIcon}
                              <span
                                 className={
                                    isReturned
                                       ? "text-green-600"
                                       : isOverdue
                                         ? "text-red-600"
                                         : isDueToday
                                           ? "text-orange-600"
                                           : "text-blue-600"
                                 }
                              >
                                 {statusText}
                              </span>
                           </div>
                        </div>
                     </div>
                  );
               })
            )}
         </div>
      </div>
   );
}
