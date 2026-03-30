// admin/components/AdminSidebar.tsx — Left sidebar with grouped menu items
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePermission } from "../hooks/usePermission";
import { ADMIN_MODULES, MODULE_GROUPS, type AdminModule } from "../registry";
import type { Permission } from "../types";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Wrapper that checks permission before rendering a sidebar item */
function SidebarItem({
  module,
  isActive,
  collapsed,
  onClick,
}: {
  module: AdminModule;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const hasPermission = usePermission(module.permission);

  if (!hasPermission) return null;

  const Icon = module.icon;

  return (
    <button
      className={`admin-sidebar__item ${isActive ? "admin-sidebar__item--active" : ""}`}
      onClick={onClick}
      title={collapsed ? module.label : undefined}
    >
      <Icon size={20} className="admin-sidebar__item-icon" />
      <span className="admin-sidebar__item-label">{module.label}</span>
    </button>
  );
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Group modules by their group key
  const groupedModules = Object.keys(MODULE_GROUPS).reduce(
    (acc, groupKey) => {
      acc[groupKey] = ADMIN_MODULES.filter((m) => m.group === groupKey);
      return acc;
    },
    {} as Record<string, AdminModule[]>
  );

  const isActive = (module: AdminModule): boolean => {
    if (module.path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(module.path);
  };

  // Determine mobile open state (not collapsed on mobile = open)
  const sidebarClasses = [
    "admin-sidebar",
    collapsed ? "admin-sidebar--collapsed" : "admin-sidebar--mobile-open",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="admin-sidebar-overlay"
          onClick={onToggle}
          role="presentation"
        />
      )}

      <aside className={sidebarClasses}>
        <nav className="admin-sidebar__nav">
          {Object.entries(groupedModules).map(([groupKey, modules]) => {
            if (modules.length === 0) return null;

            return (
              <div key={groupKey} className="admin-sidebar__group">
                <div className="admin-sidebar__group-label">
                  {MODULE_GROUPS[groupKey]}
                </div>
                {modules.map((module) => (
                  <SidebarItem
                    key={module.id}
                    module={module}
                    isActive={isActive(module)}
                    collapsed={collapsed}
                    onClick={() => navigate(module.path)}
                  />
                ))}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <a href="/" className="admin-sidebar__back-link">
            <ArrowLeft size={18} />
            <span>Uygulamaya Don</span>
          </a>
        </div>
      </aside>
    </>
  );
}
