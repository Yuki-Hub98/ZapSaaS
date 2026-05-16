import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import Header from "@/components/layout/Header";
import PageWrapper from "@/components/layout/PageWrapper";
import { useApi } from "@/hooks/useApi";
import { useTheme } from "@/hooks/useTheme";

// ── Types ─────────────────────────────────────────────────────────────────────

interface KPIs {
  revenue_today: number;
  revenue_month: number;
  appointments_today: number;
  appointments_month: number;
  pending_payments: number;
  new_clients_month: number;
  top_service: string | null;
  ticket_medio: number;
}

interface DailyRevenue { date: string; revenue: number; }
interface TopService   { name: string; total: number; }
interface HourlyData   { hour: number; total: number; }

interface DashboardData {
  kpis: KPIs;
  daily_revenue: DailyRevenue[];
  top_services: TopService[];
  hourly_appointments: HourlyData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-theme-card border border-theme rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-xs font-medium text-theme-muted">{label}</p>
      <p className="text-2xl font-bold text-theme-primary leading-tight">{value}</p>
      {sub && <p className="text-xs text-theme-muted">{sub}</p>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-theme-muted">
      <span className="text-3xl mb-2">📊</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { get } = useApi();
  const { isDark } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const gridColor   = isDark ? "#1e1e1e" : "#e5e5e5";
  const textColor   = isDark ? "#525252" : "#a3a3a3";
  const accentColor = isDark ? "#00e5a0" : "#00c97a";

  useEffect(() => {
    let cancelled = false;
    get<DashboardData>("/api/metrics/dashboard")
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Erro ao carregar métricas"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [get]);

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Visão geral do seu negócio" />
        <PageWrapper>
          <div className="flex items-center justify-center py-32">
            <span className="w-8 h-8 border-2 border-theme border-t-accent rounded-full animate-spin" />
          </div>
        </PageWrapper>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header title="Dashboard" />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center py-32 text-theme-muted">
            <span className="text-4xl mb-3">⚠️</span>
            <p className="text-sm">{error || "Erro ao carregar dados"}</p>
          </div>
        </PageWrapper>
      </>
    );
  }

  const { kpis, daily_revenue, top_services, hourly_appointments } = data;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Visão geral do seu negócio"
      />

      <PageWrapper>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard
            label="Receita hoje"
            value={formatCurrency(kpis.revenue_today)}
          />
          <KpiCard
            label="Receita do mês"
            value={formatCurrency(kpis.revenue_month)}
          />
          <KpiCard
            label="Agendamentos hoje"
            value={String(kpis.appointments_today)}
            sub={`${kpis.appointments_month} no mês`}
          />
          <KpiCard
            label="Novos clientes"
            value={String(kpis.new_clients_month)}
            sub="este mês"
          />
        </div>

        {/* ── Segunda linha KPIs ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <KpiCard
            label="Pagamentos pendentes"
            value={formatCurrency(kpis.pending_payments)}
          />
          <KpiCard
            label="Serviço mais vendido"
            value={kpis.top_service ?? "—"}
            sub="este mês"
          />
          <KpiCard
            label="Ticket médio"
            value={formatCurrency(kpis.ticket_medio)}
            sub="por atendimento"
          />
        </div>

        {/* ── Receita por dia ───────────────────────────────────────────── */}
        <div className="bg-theme-card border border-theme rounded-xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-theme-primary mb-4">Receita dos últimos 30 dias</h3>
          {daily_revenue.length === 0 ? (
            <EmptyChart message="Nenhum atendimento concluído ainda" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fill: textColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fill: textColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), "Receita"]}
                  labelFormatter={(label) => formatDate(String(label))}
                  contentStyle={{
                    background: isDark ? "#111111" : "#ffffff",
                    border: `1px solid ${gridColor}`,
                    borderRadius: 8,
                    color: isDark ? "#ffffff" : "#0a0a0a",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={accentColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: accentColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Serviços + Horários ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Serviços mais vendidos */}
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <h3 className="text-sm font-semibold text-theme-primary mb-4">Serviços mais vendidos</h3>
            {top_services.length === 0 ? (
              <EmptyChart message="Nenhum agendamento ainda" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top_services} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: textColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fill: textColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Agendamentos"]}
                    contentStyle={{
                      background: isDark ? "#111111" : "#ffffff",
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {top_services.map((_, i) => (
                      <Cell
                        key={i}
                        fill={accentColor}
                        opacity={1 - i * 0.15}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Horários mais movimentados */}
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <h3 className="text-sm font-semibold text-theme-primary mb-4">Horários mais movimentados</h3>
            {hourly_appointments.length === 0 ? (
              <EmptyChart message="Nenhum agendamento ainda" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourly_appointments}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(h) => `${h}h`}
                    tick={{ fill: textColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: textColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [v, "Agendamentos"]}
                    labelFormatter={(h) => `${h}:00`}
                    contentStyle={{
                      background: isDark ? "#111111" : "#ffffff",
                      border: `1px solid ${gridColor}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="total" fill={accentColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

      </PageWrapper>
    </>
  );
}