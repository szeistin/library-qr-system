import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

// Official Philippine Standard Geographic Code (PSGC) data, free and no key needed
const PSGC = "https://psgc.gitlab.io/api";
const OTHER = "__other__";
const DEFAULT_PROVINCE = "Albay";
const DEFAULT_MUNICIPALITY = "Polangui";

// Used only if the address list cannot be loaded for Albay
const ALBAY_FALLBACK = [
   "Bacacay",
   "Camalig",
   "Daraga",
   "Guinobatan",
   "Jovellar",
   "Legazpi City",
   "Libon",
   "Ligao City",
   "Malilipot",
   "Malinao",
   "Manito",
   "Oas",
   "Pio Duran",
   "Polangui",
   "Rapu-Rapu",
   "Santo Domingo",
   "Tabaco City",
   "Tiwi",
];

const fetchList = async (url) => {
   const res = await fetch(url);
   if (!res.ok) throw new Error("Request failed");
   const data = await res.json();
   return Array.isArray(data) ? data : [];
};

const byName = (a, b) => a.name.localeCompare(b.name);

// Albay first, then the other Bicol (Region V) provinces, then the rest A-Z
const orderProvinces = (list) => {
   const albay = list.filter((p) => p.name === DEFAULT_PROVINCE);
   const bicol = list
      .filter(
         (p) => p.name !== DEFAULT_PROVINCE && String(p.code).startsWith("05"),
      )
      .sort(byName);
   const rest = list
      .filter((p) => !String(p.code).startsWith("05"))
      .sort(byName);
   return [...albay, ...bicol, ...rest];
};

/**
 * Address picker: Province -> City/Municipality -> Barangay.
 * Calls onChange("Barangay, City/Municipality, Province") with the finished address.
 */
export default function AddressSelect({ value, onChange, selectClass = "" }) {
   const [provinces, setProvinces] = useState([]);
   const [municipalities, setMunicipalities] = useState([]);
   const [barangays, setBarangays] = useState([]);

   const [province, setProvince] = useState(null); // { code, name }
   const [municipality, setMunicipality] = useState(null); // { code, name }
   const [barangay, setBarangay] = useState("");

   const [manual, setManual] = useState(false);
   const [manualText, setManualText] = useState("");
   const [manualReason, setManualReason] = useState("");
   const [touched, setTouched] = useState(false);
   const [barangayTyped, setBarangayTyped] = useState(false);

   const [loadingProv, setLoadingProv] = useState(true);
   const [loadingMun, setLoadingMun] = useState(false);
   const [loadingBrgy, setLoadingBrgy] = useState(false);

   // Always call the newest onChange / read the newest value without re-running effects
   const onChangeRef = useRef(onChange);
   const valueRef = useRef(value);
   onChangeRef.current = onChange;
   valueRef.current = value;

   const base = `w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] focus:border-transparent`;
   const cls = selectClass || base;

   // 1. Load provinces, then default to Albay
   useEffect(() => {
      let cancelled = false;
      fetchList(`${PSGC}/provinces/`)
         .then((list) => {
            if (cancelled) return;
            const ordered = orderProvinces(list);
            setProvinces(ordered);
            const albay = ordered.find((p) => p.name === DEFAULT_PROVINCE);
            if (albay) setProvince({ code: albay.code, name: albay.name });
         })
         .catch(() => {
            if (cancelled) return;
            setManual(true);
            setManualReason(
               "The address list could not be loaded. Please type your address.",
            );
         })
         .finally(() => !cancelled && setLoadingProv(false));
      return () => {
         cancelled = true;
      };
   }, []);

   // 2. Load cities/municipalities when the province changes
   useEffect(() => {
      if (manual || !province) return;
      let cancelled = false;
      setLoadingMun(true);
      setMunicipalities([]);
      setMunicipality(null);
      setBarangays([]);
      setBarangay("");
      setBarangayTyped(false);

      fetchList(`${PSGC}/provinces/${province.code}/cities-municipalities/`)
         .then((list) => {
            if (cancelled) return;
            const sorted = [...list].sort(byName);
            setMunicipalities(sorted);

            // First load only: default to Polangui (the library's town)
            if (!touched && province.name === DEFAULT_PROVINCE) {
               const polangui = sorted.find(
                  (m) => m.name === DEFAULT_MUNICIPALITY,
               );
               if (polangui) {
                  setMunicipality({ code: polangui.code, name: polangui.name });
                  if (!valueRef.current) {
                     onChangeRef.current(`${polangui.name}, ${province.name}`);
                  }
               }
            }
         })
         .catch(() => {
            if (cancelled) return;
            if (province.name === DEFAULT_PROVINCE) {
               // Fallback names for Albay (no barangay list in this case)
               setMunicipalities(
                  ALBAY_FALLBACK.map((name) => ({ code: null, name })),
               );
            } else {
               setManual(true);
               setManualReason(
                  "The address list could not be loaded. Please type your address.",
               );
            }
         })
         .finally(() => !cancelled && setLoadingMun(false));

      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [province, manual]);

   // 3. Load barangays when the city/municipality changes
   useEffect(() => {
      if (manual || !municipality) {
         setBarangays([]);
         return;
      }
      if (!municipality.code) {
         setBarangayTyped(true); // no list available, let the visitor type it
         return;
      }
      let cancelled = false;
      setLoadingBrgy(true);
      setBarangay("");
      setBarangayTyped(false);

      fetchList(`${PSGC}/cities-municipalities/${municipality.code}/barangays/`)
         .then((list) => !cancelled && setBarangays([...list].sort(byName)))
         .catch(() => !cancelled && setBarangayTyped(true))
         .finally(() => !cancelled && setLoadingBrgy(false));

      return () => {
         cancelled = true;
      };
   }, [municipality, manual]);

   // 4. Build the final address text once the visitor starts choosing
   useEffect(() => {
      if (!touched) return;
      if (manual) {
         onChangeRef.current(manualText.trim());
         return;
      }
      const parts = [barangay, municipality?.name, province?.name].filter(
         Boolean,
      );
      onChangeRef.current(parts.join(", "));
   }, [touched, manual, manualText, barangay, municipality, province]);

   // ---- handlers ----
   const handleProvince = (e) => {
      setTouched(true);
      const v = e.target.value;
      if (v === OTHER) {
         setManual(true);
         setManualReason("");
         return;
      }
      setManual(false);
      const p = provinces.find((x) => x.code === v);
      setProvince(p ? { code: p.code, name: p.name } : null);
   };

   const handleMunicipality = (e) => {
      setTouched(true);
      const name = e.target.value;
      const m = municipalities.find((x) => x.name === name);
      setMunicipality(m ? { code: m.code, name: m.name } : null);
   };

   const handleBarangay = (e) => {
      setTouched(true);
      setBarangay(e.target.value);
   };

   return (
      <div>
         <label className="flex items-center gap-1 text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1">
            <MapPin className="w-3 h-3" /> Address
         </label>

         {!touched && value && (
            <p className="text-xs text-gray-400 mb-1.5">
               Current address: {value}
            </p>
         )}

         <div className="space-y-2">
            {/* Province */}
            <select
               value={manual ? OTHER : province?.code || ""}
               onChange={handleProvince}
               disabled={loadingProv}
               className={cls}
            >
               {loadingProv && <option value="">Loading provinces...</option>}
               {!loadingProv && !province && !manual && (
                  <option value="">Select province</option>
               )}
               {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                     {p.name}
                  </option>
               ))}
               <option value={OTHER}>Other (type my address)</option>
            </select>

            {manual ? (
               <>
                  {manualReason && (
                     <p className="text-xs text-amber-600">{manualReason}</p>
                  )}
                  <input
                     type="text"
                     value={manualText}
                     onChange={(e) => {
                        setTouched(true);
                        setManualText(e.target.value);
                     }}
                     placeholder="Barangay, Municipality / City, Province"
                     className={cls}
                  />
               </>
            ) : (
               <div className="grid grid-cols-2 gap-2">
                  {/* City / Municipality */}
                  <select
                     value={municipality?.name || ""}
                     onChange={handleMunicipality}
                     disabled={!province || loadingMun}
                     className={cls}
                  >
                     <option value="">
                        {loadingMun ? "Loading..." : "City / Municipality"}
                     </option>
                     {municipalities.map((m) => (
                        <option key={m.code || m.name} value={m.name}>
                           {m.name}
                        </option>
                     ))}
                  </select>

                  {/* Barangay */}
                  {barangayTyped ? (
                     <input
                        type="text"
                        value={barangay}
                        onChange={handleBarangay}
                        placeholder="Barangay"
                        disabled={!municipality}
                        className={cls}
                     />
                  ) : (
                     <select
                        value={barangay}
                        onChange={handleBarangay}
                        disabled={!municipality || loadingBrgy}
                        className={cls}
                     >
                        <option value="">
                           {loadingBrgy ? "Loading..." : "Barangay"}
                        </option>
                        {barangays.map((b) => (
                           <option key={b.code} value={b.name}>
                              {b.name}
                           </option>
                        ))}
                     </select>
                  )}
               </div>
            )}
         </div>
      </div>
   );
}
