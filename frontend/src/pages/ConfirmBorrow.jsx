import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { borrowBook } from "../api/api";
import { ArrowLeft, Phone, Mail, Calendar, BookOpen, CheckCircle } from "lucide-react";

export default function ConfirmBorrow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { book } = location.state || {};
  const [visitor, setVisitor] = useState(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [returnDays, setReturnDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("visitor");
    if (!stored || !book) {
      navigate("/");
      return;
    }
    const v = JSON.parse(stored);
    setVisitor(v);
    if (v.phone) setPhone(v.phone);
    if (v.email) setEmail(v.email);
  }, [book, navigate]);

  const validate = () => {
    const errors = {};
    if (!phone.trim()) errors.phone = "Required";
    if (!email.trim()) errors.email = "Required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + returnDays);
    const payload = {
      visitorId: visitor.id,
      bookId: book._id,
      dueDate: dueDate.toISOString(),
      phone,
      email,
    };
    try {
      const result = await borrowBook(localStorage.getItem("token"), payload);
      localStorage.setItem("borrowInfo", JSON.stringify({
        book,
        borrowDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
        borrow_qr_token: result.borrow_qr_token,
        phone,
        email,
      }));
      navigate("/mobile/borrow-success");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!book) return null;

  const inputClass = (field) => `
    w-full border ${fieldErrors[field] ? "border-red-400 bg-red-50" : "border-gray-200"} rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]
  `;

  return (
    <>
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white text-sm font-bold">CONFIRM BORROW</p>
            <p className="text-blue-200 text-xs">Review your borrow details</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-gray-400 text-xs uppercase tracking-wide">SELECTED BOOK</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-9 h-12 bg-gradient-to-b from-[#1B3A6B] to-[#2a5298] rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[#1B3A6B] text-sm font-bold">{book.title}</p>
              <p className="text-gray-400 text-xs">{book.author}</p>
              <span className="text-xs bg-[#EBF0F7] text-[#1B3A6B] px-2 py-0.5 rounded-full">{book.category}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1 block">Contact Number *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass("phone")} placeholder="09XXXXXXXXX" />
            {fieldErrors.phone && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.phone}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1 block">Email Address *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass("email")} placeholder="you@example.com" />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.email}</p>}
            <p className="text-gray-400 text-xs mt-1">📧 Due date reminders will be sent to this email & number</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Return Date (1–3 days)</p>
          <div className="flex gap-2">
            {[1, 2, 3].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setReturnDays(days)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${returnDays === days ? "bg-[#1B3A6B] text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {days} Day{days > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <div className="bg-[#F0F4F8] rounded-xl p-2.5 mt-3 text-center">
            <p className="text-[#1B3A6B] font-bold text-sm">Due date: {new Date(Date.now() + returnDays * 86400000).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-lg">📱</span>
          <div>
            <p className="text-blue-700 text-xs font-semibold">You may receive an Email reminder on your due date.</p>
            <p className="text-blue-600 text-xs">The system will send a reminder to your registered contact details.</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#C9A227] text-white py-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" /> CONFIRM & GENERATE QR</>}
        </button>
      </div>
    </>
  );
}