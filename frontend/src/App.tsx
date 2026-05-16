import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import LoginPage from "./pages/login/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import CompanyLayout from "./pages/company/CompanyLayout";

// Admin pages
import CompaniesPage from "./pages/admin/CompaniesPage";
import AdminMetrics from "./pages/admin/AdminMetrics";

// Company pages
import DashboardPage from "./pages/company/DashboardPage";
import AppointmentsPage from "./pages/company/AppointmentsPage";
import ServicesPage from "./pages/company/ServicesPage";
import PaymentsPage from "./pages/company/PaymentsPage";
import WhatsAppPage from "./pages/company/WhatsAppPage";
import SettingsPage from "./pages/company/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* SUPER_ADMIN */}
          <Route element={<ProtectedRoute role="SUPER_ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminMetrics />} />
              <Route path="companies" element={<CompaniesPage />} />
            </Route>
          </Route>

          {/* COMPANY_ADMIN */}
          <Route element={<ProtectedRoute role="COMPANY_ADMIN" />}>
            <Route path="/company" element={<CompanyLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="whatsapp" element={<WhatsAppPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}