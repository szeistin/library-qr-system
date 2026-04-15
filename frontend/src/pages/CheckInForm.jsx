import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { registerVisitor } from "../api/api";
import {
  ArrowLeft, User, MapPin, Calendar, Users, GraduationCap, Briefcase, Target, Accessibility
} from "lucide-react";

const professionOptions = ["Student", "Teacher", "Government Employee", "Private Employee", "Self-Employed", "Retired", "Other"];
const purposeOptions = ["Study / Research", "Read Books", "Borrow Books", "Attend Event", "Use Computer", "Other"];

export default function CheckInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const editMode = location.state?.editMode || false;

  const [formData, setFormData] = useState({
    name: "", address: "", dob: "", gender: "", course: "", school_work: "", profession: "", purpose: ""
  });
  const [customPurpose, setCustomPurpose] = useState("");
  const [isPWD, setIsPWD] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (editMode) {
      const stored = localStorage.getItem("visitor");
      if (stored) {
        const visitor = JSON.parse(stored);
        setFormData({
          name: visitor.name || "",
          address: visitor.address || "",
          dob: visitor.dob ? visitor.dob.split("T")[0] : "",
          gender: visitor.gender || "",
          course: visitor.course || "",
          school_work: visitor.school_work || "",
          profession: visitor.profession || "",
          purpose: visitor.purpose || "",
        });
        if (visitor.purpose && !purposeOptions.includes(visitor.purpose)) {
          setCustomPurpose(visitor.purpose);
        }
      }
    }
  }, [editMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "purpose") {
      setFormData({ ...formData, purpose: value });
      if (value !== "Other") setCustomPurpose("");
    } else {
      setFormData({ ...formData, [name]: value });
    }
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: "" });
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Required";
    if (!formData.dob) errors.dob = "Required";
    if (!formData.gender) errors.gender = "Required";
    if (!formData.profession) errors.profession = "Required";
    if (!formData.purpose) errors.purpose = "Required";
    if (formData.purpose === "Other" && !customPurpose.trim()) errors.customPurpose = "Please specify your purpose";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      const finalPurpose = formData.purpose === "Other" ? customPurpose.trim() : formData.purpose;
      const result = await registerVisitor({
        ...formData,
        phone: "",
        email: "",
        purpose: finalPurpose,
        isPWD
      });
      const fullVisitor = {
        ...result,
        name: formData.name,
        address: formData.address,
        dob: formData.dob,
        gender: formData.gender,
        course: formData.course,
        school_work: formData.school_work,
        profession: formData.profession,
        purpose: finalPurpose,
        isPWD
      };
      localStorage.setItem("visitor", JSON.stringify(fullVisitor));
      navigate("/mobile/qr-pass");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `
    w-full border ${fieldErrors[field] ? "border-red-400 bg-red-50" : "border-gray-200"} rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent
  `;

  return (
    <>
      {/* Header Bar */}
      <div className="bg-[#1B3A6B] px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white text-sm font-bold">FILL UP INFORMATION</p>
            <p className="text-blue-200 text-xs">All fields are required unless marked optional</p>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <div className="px-4 py-4 space-y-3 pb-6">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

        <div>
          <label className="flex items-center gap-1 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
            <User className="w-3 h-3" /> Full Name *
          </label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass("name")} placeholder="Juan Dela Cruz" />
          {fieldErrors.name && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
            <MapPin className="w-3 h-3" /> Address
          </label>
          <input type="text" name="address" value={formData.address} onChange={handleChange} className={inputClass("address")} placeholder="Polangui, Albay" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
              <Calendar className="w-3 h-3" /> Date of Birth *
            </label>
            <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={inputClass("dob")} />
            {fieldErrors.dob && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.dob}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1 block">Gender *</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass("gender")}>
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
            {fieldErrors.gender && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.gender}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 font-medium mb-1">
              <GraduationCap className="w-3 h-3" /> Year / Course <span className="text-gray-400">(optional)</span>
            </label>
            <input type="text" name="course" value={formData.course} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" placeholder="e.g. 3rd year BSIS" />
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500 font-medium mb-1">
              <Briefcase className="w-3 h-3" /> School / Work <span className="text-gray-400">(optional)</span>
            </label>
            <input type="text" name="school_work" value={formData.school_work} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]" placeholder="e.g. Bicol University" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
            <Briefcase className="w-3 h-3" /> Profession *
          </label>
          <select name="profession" value={formData.profession} onChange={handleChange} className={inputClass("profession")}>
            <option value="">Select profession</option>
            {professionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {fieldErrors.profession && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.profession}</p>}
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
            <Target className="w-3 h-3" /> Purpose of Visit *
          </label>
          <select name="purpose" value={formData.purpose} onChange={handleChange} className={inputClass("purpose")}>
            <option value="">Select purpose</option>
            {purposeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {fieldErrors.purpose && <p className="text-red-500 text-xs mt-0.5">{fieldErrors.purpose}</p>}
          {formData.purpose === "Other" && (
            <input
              type="text"
              value={customPurpose}
              onChange={e => setCustomPurpose(e.target.value)}
              placeholder="Please specify your purpose"
              className={`mt-2 w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] ${fieldErrors.customPurpose ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            />
          )}
        </div>

        {/* PWD Toggle Row */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Accessibility className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Person with Disability (PWD)</p>
              <p className="text-xs text-gray-400">Are you a PWD card holder?</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPWD(!isPWD)}
            className={`w-12 h-6 rounded-full transition-colors ${isPWD ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${isPWD ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#C9A227] text-white font-bold text-sm py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "GENERATE QR VISITOR PASS"
          )}
        </button>
        <p className="text-center text-gray-400 text-xs mt-2">Your information is stored locally and used only for library statistics.</p>
      </div>
    </>
  );
}