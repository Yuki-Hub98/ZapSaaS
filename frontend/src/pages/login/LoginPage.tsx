import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const role = await login(email, password);
      navigate(role === "SUPER_ADMIN" ? "/admin" : "/company", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#111111] border border-[#1e1e1e] rounded-2xl p-10">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-emerald-400 tracking-tight">ZapSaaS</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-neutral-500 mb-8">
          Entre na sua conta para continuar
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-neutral-400 tracking-wide">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="
                bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg
                px-4 py-3 text-sm text-white placeholder:text-neutral-700
                outline-none transition-colors
                focus:border-emerald-400
              "
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-neutral-400 tracking-wide">
              Senha
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="
                bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg
                px-4 py-3 text-sm text-white placeholder:text-neutral-700
                outline-none transition-colors
                focus:border-emerald-400
              "
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-950 border border-red-900 rounded-lg px-4 py-3 text-xs text-red-400">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              bg-emerald-400 text-black font-semibold rounded-lg
              py-3 text-sm flex items-center justify-center min-h-12
              transition-opacity active:scale-[0.98]
              hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              : "Entrar"
            }
          </button>

        </form>
      </div>
    </div>
  );
}