import { useState, useEffect } from "react";
import {
   Smartphone,
   QrCode,
   UserPlus,
   Users,
   Search,
   ExternalLink,
} from "lucide-react";
import QRCode from "qrcode";

const API_URL = import.meta.env.VITE_API_URL;

export default function VisitorMobilePass() {
   const [qrDataUrl, setQrDataUrl] = useState("");
   const [visitors, setVisitors] = useState([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [todayCheckIns, setTodayCheckIns] = useState(0);
   const token = localStorage.getItem("token");
   const headers = { Authorization: `Bearer ${token}` };
   const mobileUrl = `${window.location.origin}/mobile`;

   useEffect(() => {
      QRCode.toDataURL(mobileUrl, (err, url) => {
         if (!err) setQrDataUrl(url);
      });
   }, []);

   useEffect(() => {
      const fetchVisitors = async () => {
         try {
            const res = await fetch(`${API_URL}/visitors`, { headers });
            if (res.ok) setVisitors(await res.json());
         } catch (err) {
            console.error(err);
         }
      };
      const fetchTodayCheckIns = async () => {
         try {
            const res = await fetch(`${API_URL}/visits/today`, { headers });
            if (res.ok) setTodayCheckIns((await res.json()).length);
         } catch (err) {
            console.error(err);
         }
      };
      fetchVisitors();
      fetchTodayCheckIns();
   }, []);

   const filteredVisitors = visitors.filter(
      (v) =>
         v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         v.reference_number.toLowerCase().includes(searchTerm.toLowerCase()),
   );

   return (
      <div className="p-4 md:p-6 space-y-5">
         {/* Hero Header */}
         <div className="bg-gradient-to-r from-[#1B3A6B] to-[#2a5298] rounded-2xl p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#C9A227] rounded-2xl flex items-center justify-center">
                     <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                     <h1 className="font-bold text-lg">Visitor Mobile Pass</h1>
                     <p className="text-blue-200 text-sm">
                        QR Visitor Registration System
                     </p>
                     <p className="text-blue-300 text-xs mt-1">
                        For non‑tech visitors, staff can assist using this page
                        or the reference number system
                     </p>
                  </div>
               </div>
               <a
                  href={mobileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-[#1B3A6B] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50 inline-flex items-center gap-1"
               >
                  Open Mobile Site <ExternalLink className="w-4 h-4" />
               </a>
            </div>
         </div>

         {/* Two-Column Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Mobile Website QR */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
               <div className="flex items-center gap-2 mb-3">
                  <QrCode className="w-5 h-5 text-[#1B3A6B]" />
                  <div>
                     <h3 className="text-[#1B3A6B] font-bold text-sm">
                        Mobile Website QR
                     </h3>
                     <p className="text-gray-400 text-xs">
                        Show visitors to open on their phone
                     </p>
                  </div>
               </div>
               <div className="bg-[#F5F7FA] rounded-xl p-5 flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-inner">
                     {qrDataUrl && (
                        <img
                           src={qrDataUrl}
                           alt="Mobile QR"
                           className="w-40 h-40"
                        />
                     )}
                  </div>
               </div>
               <p className="text-gray-400 text-xs break-all text-center mt-2">
                  {mobileUrl}
               </p>
               <div className="bg-[#F0F4F8] rounded-xl p-3 mt-3">
                  <p className="text-gray-500 text-xs font-semibold mb-1">
                     Instructions for Visitors:
                  </p>
                  <ol className="list-decimal list-inside text-gray-500 text-xs space-y-1">
                     <li>Open your phone's camera or QR scanner</li>
                     <li>Scan the QR code above</li>
                     <li>Fill in your visitor information</li>
                     <li>Generate your personal QR Visitor Pass</li>
                     <li>Show your QR code at the entrance</li>
                  </ol>
               </div>
            </div>

            {/* Right: Staff Assistance Mode */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
               <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-5 h-5 text-[#1B3A6B]" />
                  <div>
                     <h3 className="text-[#1B3A6B] font-bold text-sm">
                        Staff Assistance Mode
                     </h3>
                     <p className="text-gray-400 text-xs">
                        Help visitors without phones
                     </p>
                  </div>
               </div>
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 mb-4">
                  <span className="text-lg">💡</span>
                  <p className="text-amber-700 text-xs">
                     For seniors, non‑tech visitors, or those without
                     smartphones, staff can fill out the registration form here
                     on the admin computer and generate their QR Visitor Pass.
                  </p>
               </div>
               <a
                  href={`${mobileUrl}/checkin`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#1B3A6B] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mb-4"
               >
                  Open Visitor Registration Form{" "}
                  <ExternalLink className="w-4 h-4" />
               </a>
               <div className="grid grid-cols-2 gap-3 bg-[#F0F4F8] rounded-xl p-3 text-center">
                  <div>
                     <p className="text-gray-400 text-xs">
                        Registered Visitors
                     </p>
                     <p className="text-2xl font-bold text-[#1B3A6B]">
                        {visitors.length}
                     </p>
                  </div>
                  <div>
                     <p className="text-gray-400 text-xs">Today's Check‑ins</p>
                     <p className="text-2xl font-bold text-[#C9A227]">
                        {todayCheckIns}
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* Visitor Directory */}
         <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
               <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1B3A6B]" />
                  <h3 className="text-[#1B3A6B] font-bold text-sm">
                     Visitor Directory
                  </h3>
                  <p className="text-gray-400 text-xs">
                     {visitors.length} registered visitors
                  </p>
               </div>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                     type="text"
                     placeholder="Search by name or reference..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-48 focus:outline-none focus:ring-2 focus:ring-[#1B3A6B]"
                  />
               </div>
            </div>
            <div className="overflow-x-auto">
               <table className="min-w-full text-xs">
                  <thead className="bg-[#F5F7FA]">
                     <tr>
                        <th className="p-2 text-left">Name</th>
                        <th>Reference</th>
                        <th>Profession</th>
                        <th>Library Card</th>
                        <th>Last Purpose</th>
                     </tr>
                  </thead>
                  <tbody>
                     {filteredVisitors.length === 0 ? (
                        <tr>
                           <td
                              colSpan={5}
                              className="text-center py-8 text-gray-400"
                           >
                              <Users className="w-12 h-12 mx-auto opacity-30 mb-2" />
                              <p>No visitors registered yet.</p>
                           </td>
                        </tr>
                     ) : (
                        filteredVisitors.map((v) => (
                           <tr
                              key={v._id}
                              className="border-b hover:bg-gray-50"
                           >
                              <td className="p-2">
                                 <span className="font-semibold text-gray-800">
                                    {v.name}
                                 </span>
                                 <div className="text-gray-400 text-[11px]">
                                    {v.gender} • {v.address || "—"}
                                 </div>
                              </td>
                              <td className="p-2 font-mono text-[#1B3A6B] font-semibold">
                                 {v.reference_number}
                              </td>
                              <td className="p-2">{v.profession || "—"}</td>
                              <td className="p-2">
                                 <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[11px]">
                                    ✓ Yes
                                 </span>
                              </td>
                              <td className="p-2">{v.purpose || "—"}</td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
}
