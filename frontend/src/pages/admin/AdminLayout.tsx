import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";

const NAV_ITEMS = [
  { to: "/admin",            icon: "📊", label: "Métricas"   },
  { to: "/admin/companies",  icon: "🏢", label: "Empresas"   },
];

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-theme-secondary">
      <Sidebar items={NAV_ITEMS} title="ZapSaaS Admin" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}