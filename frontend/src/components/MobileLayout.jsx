
import { Outlet } from "react-router-dom";

export default function MobileLayout() {
  return (
    <div className="mobile-layout">
      <div className="mobile-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
