import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";

const NAV_ITEMS = [
  { to: "/company",              icon: "📊", label: "Dashboard"     },
  { to: "/company/appointments", icon: "📅", label: "Agendamentos"  },
  { to: "/company/services",     icon: "✂️",  label: "Serviços"      },
  { to: "/company/payments",     icon: "💰", label: "Pagamentos"    },
  { to: "/company/whatsapp",     icon: "💬", label: "WhatsApp"      },
  { to: "/company/settings",     icon: "⚙️",  label: "Configurações" },
];

export default function CompanyLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-theme-secondary">
      <Sidebar items={NAV_ITEMS} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}