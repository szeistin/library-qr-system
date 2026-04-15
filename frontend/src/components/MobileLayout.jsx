import { Outlet } from "react-router-dom";

export default function MobileLayout() {
   return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
         <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-xl">
            <Outlet />
         </div>
      </div>
   );
}
