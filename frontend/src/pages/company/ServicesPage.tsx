import { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import PageWrapper from "@/components/layout/PageWrapper";
import { useApi } from "@/hooks/useApi";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
}

const EMPTY_FORM = { name: "", price: "", duration_minutes: "" };

export default function ServicesPage() {
  const { get, post, put, del } = useApi();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    get<Service[]>("/api/services")
      .then((data) => { if (!cancelled) { setServices(data); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Erro ao carregar serviços"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [get]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      price: String(service.price),
      duration_minutes: String(service.duration_minutes),
    });
    setError("");
    setShowForm(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      duration_minutes: parseInt(form.duration_minutes),
    };
    try {
      if (editingId) {
        const updated = await put<Service>(`/api/services/${editingId}`, payload);
        setServices((prev) => prev.map((s) => s.id === editingId ? updated : s));
      } else {
        const created = await post<Service>("/api/services", payload);
        setServices((prev) => [...prev, created]);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch {
      setError("Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(service: Service) {
    try {
      const updated = await put<Service>(`/api/services/${service.id}`, { active: !service.active });
      setServices((prev) => prev.map((s) => s.id === service.id ? updated : s));
    } catch {
      setError("Erro ao atualizar serviço");
    }
  }

  async function handleDelete(service: Service) {
    if (!confirm(`Remover "${service.name}"?`)) return;
    try {
      await del(`/api/services/${service.id}`);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch {
      setError("Erro ao remover serviço");
    }
  }

  const activeServices = services.filter((s) => s.active);
  const totalRevenuePotential = activeServices.reduce((acc, s) => acc + s.price, 0);

  return (
    <>
      <Header
        title="Serviços"
        subtitle={`${services.length} serviço${services.length !== 1 ? "s" : ""} cadastrado${services.length !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={openCreate}
            className="bg-accent text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            + Novo serviço
          </button>
        }
      />

      <PageWrapper>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-950 border border-red-900 rounded-lg px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold text-theme-primary mb-4">
              {editingId ? "Editar serviço" : "Novo serviço"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="flex flex-col gap-1.5 md:col-span-3">
                <label className="text-xs font-medium text-theme-secondary">Nome do serviço</label>
                <input
                  name="name" value={form.name} onChange={handleChange} required
                  placeholder="Ex: Corte masculino"
                  className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-theme-secondary">Preço (R$)</label>
                <input
                  name="price" type="number" step="0.01" min="0.01"
                  value={form.price} onChange={handleChange} required
                  placeholder="35.00"
                  className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-theme-secondary">Duração (minutos)</label>
                <input
                  name="duration_minutes" type="number" min="1"
                  value={form.duration_minutes} onChange={handleChange} required
                  placeholder="45"
                  className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-accent text-black font-semibold text-sm px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Salvando...</>
                    : editingId ? "Salvar" : "Criar"
                  }
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="px-4 py-2.5 text-sm text-theme-secondary border border-theme rounded-lg hover:bg-theme-tertiary transition-colors"
                >
                  Cancelar
                </button>
              </div>

            </form>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-theme border-t-accent rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-theme-muted">
            <span className="text-4xl mb-3">✂️</span>
            <p className="text-sm">Nenhum serviço cadastrado ainda.</p>
            <button onClick={openCreate} className="mt-3 text-accent text-sm font-medium hover:underline">
              Cadastrar primeiro serviço
            </button>
          </div>
        ) : (
          <>
            {/* Tabela */}
            <div className="bg-theme-card border border-theme rounded-xl overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="text-left px-5 py-3 text-xs font-medium text-theme-muted">Serviço</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-theme-muted">Preço</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-theme-muted">Duração</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-theme-muted">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-theme-muted">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service, i) => (
                    <tr
                      key={service.id}
                      className={`transition-colors hover:bg-theme-secondary ${i !== services.length - 1 ? "border-b border-theme" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <span className={`font-medium ${service.active ? "text-theme-primary" : "text-theme-muted line-through"}`}>
                          {service.name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-accent">
                        R$ {Number(service.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-theme-secondary">
                        {service.duration_minutes} min
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggle(service)}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                            service.active
                              ? "bg-green-950 text-green-400 border-green-900"
                              : "bg-red-950 text-red-400 border-red-900"
                          }`}
                        >
                          {service.active ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(service)}
                            className="text-xs text-theme-muted hover:text-theme-primary border border-theme rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(service)}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-theme-card border border-theme rounded-xl px-5 py-4">
                <p className="text-xs text-theme-muted mb-1">Total de serviços</p>
                <p className="text-xl font-bold text-theme-primary">{services.length}</p>
              </div>
              <div className="bg-theme-card border border-theme rounded-xl px-5 py-4">
                <p className="text-xs text-theme-muted mb-1">Serviços ativos</p>
                <p className="text-xl font-bold text-accent">{activeServices.length}</p>
              </div>
              <div className="bg-theme-card border border-theme rounded-xl px-5 py-4 col-span-2 md:col-span-1">
                <p className="text-xs text-theme-muted mb-1">Ticket médio</p>
                <p className="text-xl font-bold text-theme-primary">
                  R$ {activeServices.length > 0
                    ? (totalRevenuePotential / activeServices.length).toFixed(2)
                    : "0.00"
                  }
                </p>
              </div>
            </div>
          </>
        )}

      </PageWrapper>
    </>
  );
}