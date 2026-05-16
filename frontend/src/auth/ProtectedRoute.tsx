import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  role?: Role;
}

export function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return (
      <Navigate
        to={user.role === "SUPER_ADMIN" ? "/admin" : "/company"}
        replace
      />
    );
  }

  return <Outlet />;
}