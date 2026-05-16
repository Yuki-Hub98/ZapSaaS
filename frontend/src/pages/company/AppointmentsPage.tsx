import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import PageWrapper from "@/components/layout/PageWrapper";
import { useApi } from "@/hooks/useApi";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  scheduled_at: string;
  status: string;
  payment_status: string;
  price: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  done: "Concluído",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  done: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const PAYMENT_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
};

const PAYMENT_COLOR: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  paid: "bg-green-500/20 text-green-400",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Manaus",
  });
}

function formatPhone(phone: string) {
  return phone.replace("@lid", "").replace("@s.whatsapp.net", "") || "—";
}

const FILTERS = ["todos", "pending", "confirmed", "done", "cancelled"];
const FILTER_LABEL: Record<string, string> = {
  todos: "Todos",
  pending: "Pendentes",
  confirmed: "Confirmados",
  done: "Concluídos",
  cancelled: "Cancelados",
};

export default function AppointmentsPage() {
  const { get, patch } = useApi();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    get("/appointments")
      .then((data) => setAppointments(data as Appointment[]))
      .finally(() => setLoading(false));
  }, [get]);

  const filtered = filter === "todos"
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const handleStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await patch(`/appointments/${id}`, { status });
      setAppointments((prev) =>
        prev.map((a) => a.id === id ? { ...a, status } : a)
      );
    } finally {
      setUpdating(null);
    }
  };

  const handlePayment = async (id: string, payment_status: string) => {
    setUpdating(id);
    try {
      await patch(`/appointments/${id}`, { payment_status });
      setAppointments((prev) =>
        prev.map((a) => a.id === id ? { ...a, payment_status } : a)
      );
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <Header title="Agendamentos" subtitle="Histórico e próximos horários" />
      <PageWrapper>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-theme-primary text-black"
                  : "bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border"
              }`}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="w-6 h-6 border-2 border-theme-border border-t-green-400 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-theme-muted">
            <span className="text-3xl mb-2">📅</span>
            <p className="text-sm">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-theme-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme-border bg-theme-surface">
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Serviço</th>
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Pagamento</th>
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Valor</th>
                  <th className="px-4 py-3 text-left text-theme-muted font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-theme-border hover:bg-theme-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-theme-text">{a.client_name}</p>
                      <p className="text-xs text-theme-muted">{formatPhone(a.client_phone)}</p>
                    </td>
                    <td className="px-4 py-3 text-theme-text">{a.service_name}</td>
                    <td className="px-4 py-3 text-theme-text whitespace-nowrap">{formatDate(a.scheduled_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_COLOR[a.payment_status] || "bg-gray-500/20 text-gray-400"}`}>
                        {PAYMENT_LABEL[a.payment_status] || a.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-theme-text whitespace-nowrap">
                      R$ {a.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {a.status === "pending" && (
                          <>
                            <button
                              disabled={updating === a.id}
                              onClick={() => handleStatus(a.id, "done")}
                              className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              ✓ Concluir
                            </button>
                            <button
                              disabled={updating === a.id}
                              onClick={() => handleStatus(a.id, "cancelled")}
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              ✕ Cancelar
                            </button>
                          </>
                        )}
                        {a.status === "done" && a.payment_status === "pending" && (
                          <button
                            disabled={updating === a.id}
                            onClick={() => handlePayment(a.id, "paid")}
                            className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                          >
                            💰 Marcar pago
                          </button>
                        )}
                        {a.status === "cancelled" && (
                          <span className="text-xs text-theme-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageWrapper>
    </>
  );
}