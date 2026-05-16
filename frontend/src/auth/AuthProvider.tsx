import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextValue } from "./AuthContext";
import type { AuthUser, JWTPayload, Role } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

// ── Provider ──────────────────────────────────────────────────────────────────

function restoreSession(): AuthUser | null {
  const token = localStorage.getItem("access_token");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return null;
  }
  const payload = decodeJWT(token);
  if (!payload) return null;
  return {
    user_id: payload.user_id,
    company_id: payload.company_id,
    role: payload.role,
    name: payload.name,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(restoreSession);
  const [loading, setLoading] = useState(false); // false porque sessão já foi restaurada

  const login = useCallback(async (email: string, password: string): Promise<Role> => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err.detail as string) ?? "Credenciais inválidas");
      }

      const { access_token, refresh_token } = await res.json() as {
        access_token: string;
        refresh_token: string;
      };

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);

      const payload = decodeJWT(access_token);
      if (!payload) throw new Error("Token inválido");

      setUser({
        user_id: payload.user_id,
        company_id: payload.company_id,
        role: payload.role,
        name: payload.name,
      });

      return payload.role;
    } finally {
      setLoading(false); // garante que limpa mesmo se der erro
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}