import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import PageWrapper from "@/components/layout/PageWrapper";
import { useApi } from "@/hooks/useApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessHour {
  id?: string;
  weekday: number;
  weekday_name: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  slot_duration: number;
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

const WEEKDAYS: BusinessHour[] = [
  { weekday: 0, weekday_name: "Segunda-feira", is_open: true,  open_time: "09:00", close_time: "18:00", slot_duration: 30 },
  { weekday: 1, weekday_name: "Terça-feira",   is_open: true,  open_time: "09:00", close_time: "18:00", slot_duration: 30 },
  { weekday: 2, weekday_name: "Quarta-feira",  is_open: true,  open_time: "09:00", close_time: "18:00", slot_duration: 30 },
  { weekday: 3, weekday_name: "Quinta-feira",  is_open: true,  open_time: "09:00", close_time: "18:00", slot_duration: 30 },
  { weekday: 4, weekday_name: "Sexta-feira",   is_open: true,  open_time: "09:00", close_time: "18:00", slot_duration: 30 },
  { weekday: 5, weekday_name: "Sábado",        is_open: true,  open_time: "09:00", close_time: "14:00", slot_duration: 30 },
  { weekday: 6, weekday_name: "Domingo",       is_open: false, open_time: null,    close_time: null,    slot_duration: 30 },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { get, put, post, del } = useApi();

  // Business hours
  const [hours, setHours] = useState<BusinessHour[]>(WEEKDAYS);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addingDate, setAddingDate] = useState(false);

  const [error, setError] = useState("");

  // Carrega horários e datas bloqueadas
  useEffect(() => {
    let cancelled = false;

    get<BusinessHour[]>("/api/business-hours")
      .then((data) => {
        if (!cancelled && data.length > 0) {
          // Mescla com os defaults para garantir todos os dias
          setHours(WEEKDAYS.map((def) => {
            const saved = data.find((d) => d.weekday === def.weekday);
            return saved ?? def;
          }));
        }
      })
      .catch(() => {});

    get<BlockedDate[]>("/api/blocked-dates")
      .then((data) => { if (!cancelled) setBlockedDates(data); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [get]);

  // ── Horários ────────────────────────────────────────────────────────────────

  function updateHour(weekday: number, field: keyof BusinessHour, value: unknown) {
    setHours((prev) => prev.map((h) =>
      h.weekday === weekday ? { ...h, [field]: value } : h
    ));
  }

  async function saveHours() {
    setSavingHours(true);
    setError("");
    try {
      const data = await put<BusinessHour[]>("/api/business-hours", hours.map((h) => ({
        weekday: h.weekday,
        is_open: h.is_open,
        open_time: h.is_open ? h.open_time : null,
        close_time: h.is_open ? h.close_time : null,
        slot_duration: h.slot_duration,
      })));
      setHours(WEEKDAYS.map((def) => {
        const saved = data.find((d) => d.weekday === def.weekday);
        return saved ?? def;
      }));
      setHoursSuccess(true);
      setTimeout(() => setHoursSuccess(false), 3000);
    } catch {
      setError("Erro ao salvar horários");
    } finally {
      setSavingHours(false);
    }
  }

  // ── Datas bloqueadas ────────────────────────────────────────────────────────

  async function addBlockedDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;
    setAddingDate(true);
    try {
      const created = await post<BlockedDate>("/api/blocked-dates", {
        date: newDate,
        reason: newReason || null,
      });
      setBlockedDates((prev) => [...prev, created]);
      setNewDate("");
      setNewReason("");
    } catch {
      setError("Erro ao adicionar data");
    } finally {
      setAddingDate(false);
    }
  }

  async function removeBlockedDate(id: string) {
    try {
      await del(`/api/blocked-dates/${id}`);
      setBlockedDates((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Erro ao remover data");
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Header title="Configurações" subtitle="Horários de funcionamento e datas bloqueadas" />

      <PageWrapper>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-950 border border-red-900 rounded-lg px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {/* ── Horários de funcionamento ─────────────────────────────────── */}
        <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-theme-primary">Horários de funcionamento</h2>
              <p className="text-xs text-theme-muted mt-0.5">O bot usará esses horários para oferecer slots disponíveis</p>
            </div>
            <button
              onClick={saveHours}
              disabled={savingHours}
              className="bg-accent text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {savingHours
                ? <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Salvando...</>
                : hoursSuccess ? "✓ Salvo!" : "Salvar horários"
              }
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {hours.map((hour) => (
              <div key={hour.weekday} className="flex items-center gap-4 py-3 border-b border-theme last:border-0">

                {/* Toggle aberto/fechado */}
                <button
                  onClick={() => updateHour(hour.weekday, "is_open", !hour.is_open)}
                  className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                    hour.is_open ? "bg-accent" : "bg-theme-tertiary"
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    hour.is_open ? "left-5" : "left-1"
                  }`} />
                </button>

                {/* Nome do dia */}
                <span className={`w-32 text-sm font-medium shrink-0 ${
                  hour.is_open ? "text-theme-primary" : "text-theme-muted"
                }`}>
                  {hour.weekday_name}
                </span>

                {hour.is_open ? (
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-theme-muted">Abre</label>
                      <input
                        type="time"
                        value={hour.open_time ?? ""}
                        onChange={(e) => updateHour(hour.weekday, "open_time", e.target.value)}
                        className="bg-theme-secondary border border-theme rounded-lg px-3 py-1.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-theme-muted">Fecha</label>
                      <input
                        type="time"
                        value={hour.close_time ?? ""}
                        onChange={(e) => updateHour(hour.weekday, "close_time", e.target.value)}
                        className="bg-theme-secondary border border-theme rounded-lg px-3 py-1.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-theme-muted">Intervalo</label>
                      <select
                        value={hour.slot_duration}
                        onChange={(e) => updateHour(hour.weekday, "slot_duration", parseInt(e.target.value))}
                        className="bg-theme-secondary border border-theme rounded-lg px-3 py-1.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                      >
                        <option value={15}>15 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-theme-muted">Fechado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Datas bloqueadas ──────────────────────────────────────────── */}
        <div className="bg-theme-card border border-theme rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-theme-primary">Datas bloqueadas</h2>
            <p className="text-xs text-theme-muted mt-0.5">Feriados, folgas e dias sem atendimento</p>
          </div>

          {/* Form adicionar data */}
          <form onSubmit={addBlockedDate} className="flex items-end gap-3 mb-5 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-theme-secondary">Data</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-40">
              <label className="text-xs font-medium text-theme-secondary">Motivo <span className="text-theme-muted">(opcional)</span></label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Ex: Natal, folga..."
                className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={addingDate}
              className="bg-accent text-black text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {addingDate ? "Adicionando..." : "+ Adicionar"}
            </button>
          </form>

          {/* Lista datas bloqueadas */}
          {blockedDates.length === 0 ? (
            <p className="text-sm text-theme-muted">Nenhuma data bloqueada.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {blockedDates.map((blocked) => (
                <div key={blocked.id} className="flex items-center justify-between bg-theme-secondary border border-theme rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base">🔒</span>
                    <div>
                      <p className="text-sm font-medium text-theme-primary">
                        {new Date(blocked.date + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "long", day: "2-digit", month: "long", year: "numeric"
                        })}
                      </p>
                      {blocked.reason && (
                        <p className="text-xs text-theme-muted">{blocked.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeBlockedDate(blocked.id)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </PageWrapper>
    </>
  );
}