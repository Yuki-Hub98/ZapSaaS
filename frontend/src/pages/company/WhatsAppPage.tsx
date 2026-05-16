import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import PageWrapper from "@/components/layout/PageWrapper";
import { useApi } from "@/hooks/useApi";

type WhatsAppStatus = "connected" | "disconnected" | "qr_pending" | "loading";

interface ConnectionInfo {
  status: WhatsAppStatus;
  qr_code: string | null;
}

// ── fora do WhatsAppPage, antes dele ─────────────────────────────────────────

const STATUS_MAP = {
  connected:    { label: "● Conectado",      cls: "bg-green-950 text-green-400 border-green-900"       },
  disconnected: { label: "Desconectado",     cls: "bg-red-950 text-red-400 border-red-900"             },
  qr_pending:   { label: "Aguardando scan",  cls: "bg-yellow-950 text-yellow-400 border-yellow-900"    },
  loading:      { label: "Verificando...",   cls: "bg-theme-tertiary text-theme-muted border-theme"    },
};

function StatusBadge({ status }: { status: WhatsAppStatus }) {
  const { label, cls } = STATUS_MAP[status];
  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

export default function WhatsAppPage() {
  const { get, post, del, patch } = useApi();
  const [status, setStatus] = useState<WhatsAppStatus>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Adiciona esses estados após os existentes
const [botActive, setBotActive] = useState(true);
const [togglingBot, setTogglingBot] = useState(false);

// Adiciona esse useEffect para carregar o estado do bot
useEffect(() => {
  get<{ bot_active: boolean }>("/api/companies/me/bot-settings")
    .then((data) => setBotActive(data.bot_active))
    .catch(() => {});
}, [get]);

// Adiciona essa função
async function handleToggleBot() {
  setTogglingBot(true);
  try {
    const newValue = !botActive;
    await patch("/api/companies/me/bot-settings", { bot_active: newValue });
    setBotActive(newValue);
  } catch {
    setError("Erro ao alterar status do bot");
  } finally {
    setTogglingBot(false);
  }
}

  // Busca status inicial
  useEffect(() => {
    let cancelled = false;
    get<ConnectionInfo>("/api/whatsapp/status")
      .then((data) => {
        if (!cancelled) {
          setStatus(data.status);
          setQrCode(data.qr_code);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("disconnected");
      });
    return () => { cancelled = true; };
  }, [get]);

  // Polling quando está aguardando QR scan
  useEffect(() => {
    if (status === "qr_pending") {
      pollingRef.current = setInterval(async () => {
        try {
          const data = await get<ConnectionInfo>("/api/whatsapp/status");
          setStatus(data.status);
          setQrCode(data.qr_code);
          if (data.status === "connected") {
            clearInterval(pollingRef.current!);
          }
        } catch {
          // silencia erros do polling
        }
      }, 5000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, get]);

  async function handleConnect() {
    setConnecting(true);
    setError("");
    try {
      const data = await post<ConnectionInfo>("/api/whatsapp/connect", {});
      setStatus(data.status);
      setQrCode(data.qr_code);
    } catch {
      setError("Erro ao iniciar conexão. Verifique se a Evolution API está rodando.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError("");
    try {
      await del("/api/whatsapp/disconnect");
      setStatus("disconnected");
      setQrCode(null);
    } catch {
      setError("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <Header
        title="WhatsApp"
        subtitle="Conexão do bot com o WhatsApp"
        actions={<StatusBadge  status={status} />}
      />

      <PageWrapper>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-950 border border-red-900 rounded-lg px-4 py-3 text-sm text-red-400">
            ⚠ {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── Card de status ─────────────────────────────────────────── */}
          <div className="bg-theme-card border border-theme rounded-xl p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-theme-primary mb-1">Status da conexão</h2>
              <p className="text-xs text-theme-muted">
                {status === "connected"
                  ? "O bot está ativo e pronto para receber mensagens."
                  : status === "qr_pending"
                  ? "Escaneie o QR Code com o WhatsApp do número da empresa."
                  : "O bot está desconectado. Conecte para começar a atender."}
              </p>
            </div>

            {/* Indicador visual */}
            <div className="flex items-center gap-4 bg-theme-secondary border border-theme rounded-xl px-5 py-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                status === "connected"  ? "bg-green-950" :
                status === "qr_pending" ? "bg-yellow-950" :
                "bg-theme-tertiary"
              }`}>
                {status === "connected"    ? "✅" :
                  status === "qr_pending"   ? "📱" :
                  status === "loading"      ? "⏳" : "❌"}
              </div>
              <div>
                <p className="text-sm font-semibold text-theme-primary">
                  {status === "connected"    ? "Bot online"           :
                    status === "qr_pending"   ? "Aguardando scan"      :
                    status === "loading"      ? "Verificando..."       :
                    "Bot offline"}
                </p>
                <p className="text-xs text-theme-muted mt-0.5">
                  {status === "connected"    ? "Recebendo mensagens"  :
                    status === "qr_pending"   ? "Escaneie o QR Code"   :
                    status === "loading"      ? "Buscando status..."   :
                    "Nenhuma sessão ativa"}
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-2">
              {status !== "connected" && (
                <button
                  onClick={handleConnect}
                  disabled={connecting || status === "loading"}
                  className="bg-accent text-black font-semibold text-sm px-4 py-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {connecting
                    ? <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Conectando...</>
                    : "📱 Conectar WhatsApp"
                  }
                </button>
              )}
              {status === "connected" && (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-400 border border-red-900 font-semibold text-sm px-4 py-3 rounded-lg hover:bg-red-950 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {disconnecting ? "Desconectando..." : "Desconectar"}
                </button>
              )}
            </div>
          </div>

          {/* ── QR Code ────────────────────────────────────────────────── */}
          <div className="bg-theme-card border border-theme rounded-xl p-6 flex flex-col items-center justify-center gap-4">
            {status === "qr_pending" && qrCode ? (
              <>
                <p className="text-sm font-medium text-theme-primary">Escaneie com o WhatsApp</p>
                <div className="bg-white p-4 rounded-xl">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-theme-muted text-center">
                  Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                </p>
                <div className="flex items-center gap-2 text-xs text-yellow-400">
                  <span className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                  Aguardando scan...
                </div>
              </>
            ) : status === "connected" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-950 flex items-center justify-center text-4xl">
                  ✅
                </div>
                <p className="text-sm font-semibold text-green-400">WhatsApp conectado!</p>
                <p className="text-xs text-theme-muted text-center">
                  O bot está ativo e pronto para receber e responder mensagens automaticamente.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-theme-tertiary flex items-center justify-center text-4xl">
                  💬
                </div>
                <p className="text-sm font-medium text-theme-primary">Nenhuma sessão ativa</p>
                <p className="text-xs text-theme-muted text-center">
                  Clique em "Conectar WhatsApp" para gerar o QR Code e vincular o número da empresa.
                </p>
              </>
            )}
          </div>

        </div>
        {status === "connected" && (
          <div className="bg-theme-card border border-theme rounded-xl p-6 mt-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-theme-primary">Respostas automáticas</h3>
              <p className="text-xs text-theme-muted mt-0.5">
                {botActive
                  ? "O bot está respondendo mensagens automaticamente."
                  : "O bot está pausado. Mensagens não serão respondidas automaticamente."}
              </p>
            </div>
            <button
              onClick={handleToggleBot}
              disabled={togglingBot}
              className={`w-14 h-8 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${
                botActive ? "bg-accent" : "bg-theme-tertiary"
              }`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow ${
                botActive ? "left-7" : "left-1"
              }`} />
            </button>
          </div>
        )}
        {/* ── Instruções ─────────────────────────────────────────────────── */}
        <div className="bg-theme-card border border-theme rounded-xl p-6 mt-4">
          <h3 className="text-sm font-semibold text-theme-primary mb-4">Como conectar</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Clique em conectar",    desc: "O sistema vai gerar um QR Code único para sua empresa." },
              { step: "2", title: "Escaneie o QR Code",    desc: "Abra o WhatsApp no celular → Menu → Dispositivos conectados." },
              { step: "3", title: "Bot ativado",           desc: "Seu número começa a receber e responder mensagens automaticamente." },
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-accent text-black text-xs font-bold flex items-center justify-center shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-theme-primary">{item.title}</p>
                  <p className="text-xs text-theme-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </PageWrapper>
    </>
  );
}