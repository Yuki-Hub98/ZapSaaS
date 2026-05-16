import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  items: NavItem[];
  title?: string;
}

export default function Sidebar({ items, title = "ZapSaaS" }: SidebarProps) {
  const { user, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="
      flex flex-col w-64 min-h-screen shrink-0
      bg-theme-sidebar border-r border-theme
    ">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-theme">
        <span className="text-xl">⚡</span>
        <span className="text-base font-bold text-accent tracking-tight">{title}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split("/").length === 2}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors
              ${isActive
                ? "bg-accent text-black"
                : "text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary"
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-theme flex flex-col gap-1">

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full
            text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary
            transition-colors
          "
        >
          <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
          {isDark ? "Modo claro" : "Modo escuro"}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-theme-tertiary mt-1">
          <div className="
            w-8 h-8 rounded-full bg-accent flex items-center justify-center
            text-xs font-bold text-black shrink-0
          ">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-theme-primary truncate">{user?.name}</p>
            <p className="text-[11px] text-theme-muted truncate">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full
            text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary
            transition-colors mt-1
          "
        >
          <span className="text-base">🚪</span>
          Sair
        </button>
      </div>
    </aside>
  );
}