// admin/components/AdminLayout.tsx — Admin shell layout
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminTopbar } from "./AdminTopbar";
import { AdminSidebar } from "./AdminSidebar";

// Import all admin CSS
import "../styles/admin-layout.css";
import "../styles/admin-sidebar.css";
import "../styles/admin-components.css";
import "../styles/admin-table.css";
import "../styles/admin-form.css";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div className="admin-layout">
      <AdminTopbar onToggleSidebar={handleToggle} />
      <div className="admin-layout__body">
        <AdminSidebar collapsed={collapsed} onToggle={handleToggle} />
        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
