"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "assistant" | "user"; content: string; imageUrl?: string };
type Profile = { type: string; name: string } | null;
type QuickOptions = { question: string; options: string[] } | null;
type Thread = { id: string; title: string; updated_at: string };

const ACTIVE_THREAD_KEY = "agromentor_active_thread_id";
const ACTIVE_CASE_KEY = "agromentor_active_case_id";

function renderMarkdown(text: string) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#4ade80;font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#67e8f9">$1</em>')
    .replace(/^### (.+)$/gm, '<div style="color:#4ade80;font-weight:700;margin:10px 0 4px;font-size:13px;letter-spacing:0.05em;text-transform:uppercase">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="color:#67e8f9;font-weight:700;margin:12px 0 6px;font-size:15px">$1</div>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:16px;margin:3px 0;display:flex;gap:8px"><span style="color:#4ade80">▸</span><span>$1</span></div>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const QUICK_SUGGESTS = [
  "🌿 Cana com erva daninha resistente",
  "🍃 Soja com manchas — possível ferrugem",
  "🐄 Pastagem degradada — recuperação",
  "🌽 Milho com mancha foliar",
  "🌦️ Previsão para minha região",
];

const PROFILE_OPTIONS = [
  { label: "🎓 Estudante de Agronomia", price: "R$ 14,90/mês", color: "#4ade80" },
  { label: "👨‍💼 Agrônomo / Técnico", price: "R$ 59,90/mês", color: "#67e8f9" },
  { label: "🌾 Produtor Rural", price: "R$ 34,90/mês", color: "#a78bfa" },
  { label: "🏭 Usina / Empresa", price: "R$ 449,90/mês", color: "#fbbf24" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [profileDone, setProfileDone] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; plan?: string } | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [showLaudoModal, setShowLaudoModal] = useState(false);
  const [laudoObs, setLaudoObs] = useState("");
  const [quickOptions, setQuickOptions] = useState<QuickOptions>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, quickOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (threadId) localStorage.setItem(ACTIVE_THREAD_KEY, threadId);
    else localStorage.removeItem(ACTIVE_THREAD_KEY);
  }, [threadId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (caseId) localStorage.setItem(ACTIVE_CASE_KEY, caseId);
    else localStorage.removeItem(ACTIVE_CASE_KEY);
  }, [caseId]);

  async function loadThreads() {
    const res = await fetch("/api/chat/threads");
    const j = await res.json();
    if (j?.threads) setThreads(j.threads);
  }

  async function loadThread(tid: string) {
    const res = await fetch(`/api/chat/threads/${tid}`);
    const j = await res.json();
    if (j?.messages) {
      setMessages(j.messages.map((m: any) => ({ role: m.role, content: m.content, imageUrl: m.image_url || undefined })));
      setThreadId(tid);
      setCaseId(j.caseId ?? j.case_id ?? null);
      setShowHistory(false);
      setQuickOptions(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_THREAD_KEY, tid);
        const rid = j.caseId ?? j.case_id ?? null;
        if (rid) localStorage.setItem(ACTIVE_CASE_KEY, rid);
        else localStorage.removeItem(ACTIVE_CASE_KEY);
      }
    }
  }

  function getWelcomeMessage(name?: string | null) {
    if (name) return `Bem-vindo de volta, **${name}**! 🌱\n\nMe conte o que está acontecendo no campo. Informe a cultura, estágio, município e sintoma para um diagnóstico preciso.`;
    return "Olá! Seja bem-vindo ao **AgroMentor IA** 🌱\n\nSou seu consultor agronômico inteligente. Antes de começar, como você se identifica?";
  }

  async function bootstrapChat() {
    try {
      const res = await fetch("/api/usage/status");
      const j = await res.json();
      if (j?.usage) setUsage(j.usage);
      const savedThreadId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_THREAD_KEY) : null;
      const savedCaseId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_CASE_KEY) : null;

      if (j?.profile) {
        setProfile(j.profile);
        setProfileDone(true);
        if (savedCaseId) setCaseId(savedCaseId);
        if (savedThreadId) {
          try {
            await loadThread(savedThreadId);
          } catch {
            localStorage.removeItem(ACTIVE_THREAD_KEY);
            localStorage.removeItem(ACTIVE_CASE_KEY);
            setThreadId(null);
            setCaseId(null);
            setMessages([{ role: "assistant", content: getWelcomeMessage(j.profile.name) }]);
          }
        } else {
          setMessages([{ role: "assistant", content: getWelcomeMessage(j.profile.name) }]);
        }
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACTIVE_THREAD_KEY);
          localStorage.removeItem(ACTIVE_CASE_KEY);
        }
        setThreadId(null);
        setCaseId(null);
        setMessages([{ role: "assistant", content: getWelcomeMessage() }]);
        setQuickOptions({ question: "Selecione seu perfil:", options: PROFILE_OPTIONS.map(p => p.label) });
      }
    } catch {
      setMessages([{ role: "assistant", content: getWelcomeMessage() }]);
      setQuickOptions({ question: "Selecione seu perfil:", options: PROFILE_OPTIONS.map(p => p.label) });
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => { bootstrapChat(); }, []);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendText(text: string) {
    const content = text.trim();
    if ((!content && !imageFile) || loading) return;

    let imageData: string | null = null;
    let imageMime = "image/jpeg";

    if (imageFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(imageFile);
      });
      imageData = base64;
      imageMime = imageFile.type;
    }

    const newMsg: Msg = { role: "user", content: content || "Analise esta imagem", imageUrl: imagePreview || undefined };
    const newMessages = [...messages, newMsg];
    setMessages(newMessages);
    setInput("");
    setImageFile(null);
    setImagePreview(null);
    setQuickOptions(null);
    setLoading(true);

    try {
      const requestId = createRequestId();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          threadId, imageData, imageMime, requestId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (json?.error === "LIMIT" || json?.error === "TRIAL_EXPIRED") {
          setMessages((m) => [...m, { role: "assistant", content: "⚠️ Você atingiu o limite do seu plano. Acesse **Planos** para fazer upgrade." }]);
        } else if (json?.error === "UNAUTH") {
          window.location.href = "/login";
        } else {
          setMessages((m) => [...m, { role: "assistant", content: json?.reply || "Erro ao processar. Tente novamente." }]);
        }
        return;
      }

      setMessages((m) => [...m, { role: "assistant", content: json.reply ?? "" }]);
      if (json?.threadId) { setThreadId(json.threadId); if (typeof window !== "undefined") localStorage.setItem(ACTIVE_THREAD_KEY, json.threadId); }
      if (json?.caseId) { setCaseId(json.caseId); if (typeof window !== "undefined") localStorage.setItem(ACTIVE_CASE_KEY, json.caseId); }
      if (json?.usage) setUsage(json.usage);
      if (json?.profileSaved && json?.profile) { setProfile(json.profile); setProfileDone(true); }
      if (json?.quickOptions) setQuickOptions(json.quickOptions);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erro de conexão. Verifique sua internet e tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (messages.length < 2) { setReportMsg({ text: "Envie ao menos uma mensagem antes de gerar o laudo.", type: "err" }); return; }
    setShowLaudoModal(false);
    setReportBusy(true);
    setReportMsg(null);
    try {
      const requestId = createRequestId();
      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId ?? undefined, case_id: caseId ?? undefined, confirmed_data: laudoObs ? { observations: laudoObs } : undefined, requestId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setReportMsg({ text: j?.message || j?.error || "Falha ao gerar laudo.", type: "err" }); return; }
      const reportId = j?.report?.id;
      setReportMsg({ text: "Laudo gerado com sucesso! ✅ Abrindo...", type: "ok" });
      setTimeout(() => window.open(`/api/laudos/${reportId}/pdf`, "_blank"), 800);
      if (j?.signature_token) {
        const link = `${window.location.origin}/assinar/${j.signature_token}`;
        setMessages((m) => [...m, { role: "assistant", content: `Laudo gerado! ✅\n\nLink para co-assinatura do técnico:\n\n🔗 ${link}\n\nO técnico não precisa ter conta no AgroMentor.` }]);
      }
    } catch { setReportMsg({ text: "Erro de rede ao gerar laudo.", type: "err" }); }
    finally { setReportBusy(false); setLaudoObs(""); }
  }

  function startNewConversation() {
    if (typeof window !== "undefined") { localStorage.removeItem(ACTIVE_THREAD_KEY); localStorage.removeItem(ACTIVE_CASE_KEY); }
    setThreadId(null); setCaseId(null); setQuickOptions(null); setShowHistory(false);
    setMessages([{ role: "assistant", content: profileDone ? `Bem-vindo de volta, **${profile?.name}**! 🌱\n\nO que está acontecendo no campo?` : "Olá! Como você se identifica?" }]);
    if (!profileDone) setQuickOptions({ question: "Selecione seu perfil:", options: PROFILE_OPTIONS.map(p => p.label) });
  }

  const canSend = !loading && (input.trim().length > 0 || !!imageFile);
  const usagePct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

  if (booting) {
    return (
      <main style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 20% 50%, #0a1f0e 0%, #050d08 60%, #020608 100%)", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 0 40px rgba(74,222,128,0.4)", animation: "pulse 1.5s ease-in-out infinite" }}>🌱</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontFamily: "system-ui", letterSpacing: "0.1em" }}>CARREGANDO AGROMENTOR IA...</div>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }`}</style>
      </main>
    );
  }

  return (
    <main style={{ display: "flex", height: "100vh", flexDirection: "column", background: "radial-gradient(ellipse at 20% 0%, #071a0e 0%, #040c07 50%, #020608 100%)", color: "white", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* HEADER */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(74,222,128,0.12)", background: "rgba(4,12,7,0.9)", backdropFilter: "blur(20px)", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => { setShowHistory(!showHistory); loadThreads(); }}
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 16, transition: "all 0.2s" }}
            title="Histórico"
          >📋</button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #166534, #065f46)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 20px rgba(74,222,128,0.2)" }}>🌱</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>
                Agro<span style={{ color: "#4ade80" }}>Mentor</span> <span style={{ color: "#67e8f9", fontSize: 12, fontWeight: 500 }}>IA</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>CONSULTORIA AGRONÔMICA INTELIGENTE</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {usage && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                {usage.used}/{usage.limit} msgs
                {usage.plan && <span style={{ marginLeft: 6, color: "#4ade80", fontWeight: 600 }}>{usage.plan.toUpperCase()}</span>}
              </div>
              <div style={{ width: 80, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${usagePct}%`, background: usagePct > 80 ? "#f87171" : "linear-gradient(90deg, #4ade80, #22d3ee)", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "6px 12px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, letterSpacing: "0.05em" }}>ONLINE</span>
          </div>
          {profile && (
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #166534, #0e7490)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "white" }}>
              {profile.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>
      </header>

      {/* SIDEBAR HISTÓRICO */}
      {showHistory && (
        <div style={{ position: "absolute", top: 61, left: 0, width: 280, height: "calc(100vh - 61px)", background: "rgba(4,12,7,0.97)", borderRight: "1px solid rgba(74,222,128,0.12)", zIndex: 20, display: "flex", flexDirection: "column", backdropFilter: "blur(20px)" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid rgba(74,222,128,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.8)", letterSpacing: "0.05em" }}>CONVERSAS</span>
            <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ padding: "10px", flex: 1, overflowY: "auto" }}>
            <button
              onClick={startNewConversation}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, background: "linear-gradient(135deg, rgba(74,222,128,0.12), rgba(34,211,238,0.08))", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 8, letterSpacing: "0.03em" }}
            >
              + NOVA CONVERSA
            </button>
            {threads.length === 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12, padding: "24px 0" }}>Nenhuma conversa anterior</div>}
            {threads.map((t) => (
              <button key={t.id} onClick={() => loadThread(t.id)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, background: threadId === t.id ? "rgba(74,222,128,0.08)" : "transparent", border: `1px solid ${threadId === t.id ? "rgba(74,222,128,0.2)" : "transparent"}`, cursor: "pointer", marginBottom: 4, transition: "all 0.2s" }}>
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 3 }}>{new Date(t.updated_at).toLocaleDateString("pt-BR")}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* QUICK SUGGESTS */}
      {profileDone && (
        <div style={{ display: "flex", gap: 8, padding: "8px 16px", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {QUICK_SUGGESTS.map((q) => (
            <button key={q} onClick={() => sendText(q)} disabled={loading}
              style={{ whiteSpace: "nowrap", fontSize: 11, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(74,222,128,0.15)", background: "rgba(74,222,128,0.05)", color: "rgba(255,255,255,0.6)", cursor: "pointer", flexShrink: 0, transition: "all 0.2s", fontFamily: "inherit" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* MESSAGES */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: m.role === "user" ? 13 : 18, fontWeight: 700,
              background: m.role === "user" ? "linear-gradient(135deg, #166534, #0e7490)" : "linear-gradient(135deg, #052e16, #083344)",
              border: m.role === "user" ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(34,211,238,0.2)",
              boxShadow: m.role === "user" ? "0 0 15px rgba(74,222,128,0.15)" : "0 0 15px rgba(34,211,238,0.1)",
              marginTop: 2,
            }}>
              {m.role === "user" ? (profile?.name?.[0]?.toUpperCase() ?? "U") : "🌱"}
            </div>

            <div style={{
              maxWidth: "78%", borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
              padding: "12px 16px", fontSize: 13.5, lineHeight: 1.65,
              background: m.role === "user"
                ? "linear-gradient(135deg, #166534, #0e4429)"
                : "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              border: m.role === "user" ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(255,255,255,0.06)",
              boxShadow: m.role === "user" ? "0 4px 20px rgba(74,222,128,0.1)" : "0 4px 20px rgba(0,0,0,0.2)",
              color: m.role === "user" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.88)",
            }}>
              {m.imageUrl && <img src={m.imageUrl} alt="campo" style={{ width: "100%", maxWidth: 260, borderRadius: 10, marginBottom: 10, objectFit: "cover" }} />}

              {m.role === "user" ? m.content : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}

              {i === 0 && !profileDone && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  {PROFILE_OPTIONS.map((opt) => (
                    <button key={opt.label} onClick={() => sendText(opt.label)} disabled={loading}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "inherit" }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>{opt.label}</span>
                      <span style={{ fontSize: 11, color: opt.color, fontWeight: 700 }}>{opt.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {quickOptions && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 44 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", marginBottom: 4 }}>{quickOptions.question}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {quickOptions.options.map((opt) => (
                <button key={opt} onClick={() => { setQuickOptions(null); sendText(opt); }}
                  style={{ padding: "8px 16px", borderRadius: 20, background: "linear-gradient(135deg, rgba(74,222,128,0.1), rgba(34,211,238,0.05))", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #052e16, #083344)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌱</div>
            <div style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 18px 18px 18px", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22d3ee)", animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>AgroMentor analisando...</span>
            </div>
          </div>
        )}
      </div>

      {/* REPORT MSG */}
      {reportMsg && (
        <div style={{ margin: "0 16px 8px", padding: "10px 16px", borderRadius: 12, fontSize: 13, background: reportMsg.type === "ok" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${reportMsg.type === "ok" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, color: reportMsg.type === "ok" ? "#4ade80" : "#f87171", flexShrink: 0 }}>
          {reportMsg.text}
        </div>
      )}

      {/* IMAGE PREVIEW */}
      {imagePreview && (
        <div style={{ margin: "0 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <img src={imagePreview} alt="preview" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(74,222,128,0.2)" }} />
          <div style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{imageFile?.name}</div>
          <button onClick={removeImage} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
      )}

      {/* INPUT AREA */}
      <div style={{ padding: "12px 16px 20px", borderTop: "1px solid rgba(74,222,128,0.08)", background: "rgba(4,12,7,0.8)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 16, padding: "12px 16px", transition: "border-color 0.2s" }}>
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canSend) sendText(input); }}
              placeholder={profileDone ? "Descreva o problema no campo…" : "Digite sua resposta…"}
              style={{ flex: 1, background: "transparent", outline: "none", border: "none", color: "white", fontSize: 13.5, fontFamily: "inherit" }} />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 20, lineHeight: 1, transition: "color 0.2s" }}
              title="Enviar foto do campo">📷</button>
          </div>
          <button onClick={() => sendText(input)} disabled={!canSend}
            style={{ width: 46, height: 46, borderRadius: 14, background: canSend ? "linear-gradient(135deg, #16a34a, #0e7490)" : "rgba(255,255,255,0.06)", border: canSend ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: canSend ? "pointer" : "not-allowed", fontSize: 18, boxShadow: canSend ? "0 0 20px rgba(74,222,128,0.2)" : "none", transition: "all 0.2s" }}>
            ➤
          </button>
        </div>

        {profileDone && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.05em" }}>cultura · estágio · município · sintoma</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => sendText("Detalhe tecnicamente a resposta anterior com hipóteses, como confirmar e plano de ação.")}
                disabled={loading || messages.length < 2}
                style={{ fontSize: 11, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                🔍 Detalhar
              </button>
              <button onClick={() => setShowLaudoModal(true)} disabled={reportBusy || messages.length < 2}
                style={{ fontSize: 11, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(74,222,128,0.2)", background: "rgba(74,222,128,0.06)", color: "#4ade80", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, transition: "all 0.2s" }}>
                {reportBusy ? "Gerando…" : "📄 Gerar Laudo"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LAUDO MODAL */}
      {showLaudoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 480, background: "linear-gradient(135deg, #071a0e, #040c07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: 24, boxShadow: "0 -20px 60px rgba(74,222,128,0.1)" }}>
            <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: "white" }}>📄 Gerar Laudo Técnico</h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>O laudo será gerado com base na conversa atual.</p>
            <textarea value={laudoObs} onChange={(e) => setLaudoObs(e.target.value)}
              placeholder="Observações adicionais (opcional)…" rows={3}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "white", outline: "none", resize: "none", fontFamily: "inherit", marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowLaudoModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                Cancelar
              </button>
              <button onClick={generateReport}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: "linear-gradient(135deg, #16a34a, #0e7490)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 0 20px rgba(74,222,128,0.2)" }}>
                Gerar PDF ✓
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.2); border-radius: 2px; }
        button:hover { opacity: 0.85; }
      `}</style>
    </main>
  );
}
