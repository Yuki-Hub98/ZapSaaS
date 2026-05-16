import { useState, useEffect, useCallback, startTransition } from "react";
import Header from "@/components/layout/Header";
import PageWrapper from "@/components/layout/PageWrapper";
import { useApi } from "@/hooks/useApi";

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  pix_key: string | null;
  active: boolean;
  created_at: string;
}

interface CompanyListResponse {
  items: Company[];
  total: number;
}

const EMPTY_FORM = { name: "", email: "", phone: "", password: "", pix_key: "" };

export default function CompaniesPage() {
  const { get, post, put, del } = useApi();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchCompanies = useCallback(async () => {
  try {
    const data = await get<CompanyListResponse>("/api/companies");
    setCompanies(data.items);
    setTotal(data.total);
  } catch {
    setError("Erro ao carregar empresas");
  } finally {
    setLoading(false);
  }
}, [get]);

  useEffect(() => {
    startTransition(() => {
      fetchCompanies();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setSaving(true);
    try {
      await post<Company>("/api/companies", {
        ...form,
        pix_key: form.pix_key || null,
      });
      setSuccess("Empresa criada com sucesso!");
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchCompanies();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(company: Company) {
    try {
      await put(`/api/companies/${company.id}/toggle`, {});
      fetchCompanies();
    } catch {
      setError("Erro ao atualizar empresa");
    }
  }

  async function handleDelete(company: Company) {
    if (!confirm(`Deletar "${company.name}"?\n\nEsta ação remove a empresa, o usuário e desconecta o WhatsApp. Não pode ser desfeita.`)) return;
    try {
      await del(`/api/companies/${company.id}`);
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      setTotal((t) => t - 1);
      setSuccess(`Empresa "${company.name}" deletada.`);
    } catch {
      setError("Erro ao deletar empresa");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  

  return (
    <>
      <Header
        title="Empresas"
        subtitle={`${total} empresa${total !== 1 ? "s" : ""} cadastrada${total !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => { setShowForm((v) => !v); setError(""); setSuccess(""); }}
            className="bg-accent text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            {showForm ? "Cancelar" : "+ Nova empresa"}
          </button>
        }
      />

      <PageWrapper>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-950 border border-red-900 rounded-lg px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm border border-green-900 bg-green-950 text-green-400">
            ✓ {success}
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6">
            <h2 className="text-base font-semibold text-theme-primary mb-4">Nova empresa</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "name",     label: "Nome da empresa",  placeholder: "Salão Maria",         type: "text"     },
                { name: "email",    label: "E-mail",           placeholder: "contato@empresa.com", type: "email"    },
                { name: "phone",    label: "Telefone",         placeholder: "11999990000",         type: "text"     },
                { name: "password", label: "Senha de acesso",  placeholder: "••••••••",            type: "password" },
              ].map((field) => (
                <div key={field.name} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-theme-secondary">{field.label}</label>
                  <input
                    name={field.name}
                    type={field.type}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    required
                    placeholder={field.placeholder}
                    className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-medium text-theme-secondary">
                  Chave Pix <span className="text-theme-muted">(opcional)</span>
                </label>
                <input
                  name="pix_key"
                  value={form.pix_key}
                  onChange={handleChange}
                  placeholder="CPF, CNPJ, e-mail ou telefone"
                  className="bg-theme-secondary border border-theme rounded-lg px-3 py-2.5 text-sm text-theme-primary outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-accent text-black font-semibold text-sm px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                >
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Criando...</>
                    : "Criar empresa"
                  }
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-6 h-6 border-2 border-theme border-t-accent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-theme-muted">
            <span className="text-4xl mb-3">🏢</span>
            <p className="text-sm">Nenhuma empresa cadastrada ainda.</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-accent text-sm font-medium hover:underline">
              Criar primeira empresa
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {companies.map((company) => (
              <div key={company.id} className="bg-theme-card border border-theme rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-black font-bold text-sm shrink-0">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-theme-primary">{company.name}</p>
                    <p className="text-xs text-theme-muted">{company.email} · {company.phone}</p>
                    {company.pix_key && <p className="text-xs text-theme-muted">Pix: {company.pix_key}</p>}
                    <p className="text-[10px] text-theme-muted opacity-40 font-mono mt-0.5 select-all">
                      {company.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    company.active
                      ? "bg-green-950 text-green-400 border-green-900"
                      : "bg-red-950 text-red-400 border-red-900"
                  }`}>
                    {company.active ? "Ativa" : "Inativa"}
                  </span>
                  <button
                    onClick={() => handleToggle(company)}
                    className="text-xs text-theme-muted hover:text-theme-primary border border-theme rounded-lg px-3 py-1.5 transition-colors"
                  >
                    {company.active ? "Suspender" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(company)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </PageWrapper>
    </>
  );
}