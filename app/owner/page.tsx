"use client";

import { useEffect, useState } from "react";

type UserCost = {
  messages: number;
  images: number;
  laudos: number;
  estimated_cost_usd: number;
  last_event: string | null;
};

type UserRow = {
  user_id: string;
  email: string;
  full_name: string;
  profile_type: string;
  plan: string;
  messages_used: number;
  messages_limit: number;
  laudos_used: number;
  laudos_limit: number;
  can_use_images: boolean;
  is_owner: boolean;
  last_seen_at: string | null;
  registered_at: string | null;
  expires_at: string | null;
  cost?: UserCost;
};

type Summary = {
  total_users: number;
  active_paid: number;
  using_images: number;
  total_messages_used: number;
  total_laudos_used: number;
  pending_profiles: number;
};

type GrantForm = {
  email: string;
  plan: string;
  durationDays: number;
  canUseImages: boolean;
  overrideMessages: string;
  overrideLaudos: string;
};

const PLAN_COLORS: Record<string, string> = {
  owner: "#f59e0b",
  usina: "#a78bfa",
  escritorio: "#67e8f9",
  profissional: "#4ade80",
  produtor: "#86efac",
  estudante: "#bef264",
  trial: "#6b7280",
  free: "#4b5563",
};

const PLAN_LABELS: Record<string, string> = {
  owner: "👑 Owner",
  usina: "🏭 Usina",
  escritorio: "🏢 Escritório",
  profissional: "💼 Profissional",
  produtor: "🌾 Produtor",
  estudante: "🎓 Estudante",
  trial: "⏳ Trial",
  free: "🔒 Free",
};

const PROFILE_ICONS: Record<string, string> = {
  agronomo: "👨‍💼",
  estudante: "🎓",
  produtor: "🌾",
  usina: "🏭",
  pendente: "⏳",
};

export default function OwnerPage() {
  const [data, setData] = useState<{ users: UserRow[]; summary: Summary; isOwnerMode: boolean; currentUserEmail: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [grantForm, setGrantForm] = useState<GrantForm>({ email: "", plan: "estudante", durationDays: 30, canUseImages: false, overrideMessages: "", overrideLaudos: "" });
  const [grantMsg, setGrantMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [grantLoading, setGrantLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "grant" | "health">("overview");
  const [health, setHealth] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, healthRes, logsRes] = await Promise.all([
        fetch("/api/owner/overview"),
        fetch("/api/owner/health"),
        fetch("/api/owner/logs"),
      ]);
      const overview = await overviewRes.json();
      if (!overviewRes.ok) { setError(overview?.error || "Acesso negado."); return; }
      setData(overview);
      if (healthRes.ok) setHealth(await healthRes.json());
      if (logsRes.ok) { const l = await logsRes.json(); setLogs(l?.logs || []); }
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleGrant() {
    if (!grantForm.email.trim()) { setGrantMsg({ text: "Digite o e-mail do usuário.", type: "err" }); return; }
    setGrantLoading(true);
    setGrantMsg(null);
    try {
      const res = await fetch("/api/owner/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: grantForm.email.trim(),
          plan: grantForm.plan,
          durationDays: grantForm.durationDays,
          canUseImages: grantForm.canUseImages,
          overrideMessages: grantForm.overrideMessages ? Number(grantForm.overrideMessages) : null,
          overrideLaudos: grantForm.overrideLaudos ? Number(grantForm.overrideLaudos) : null,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setGrantMsg({ text: j?.error || "Falha ao conceder acesso.", type: "err" }); return; }
      setGrantMsg({ text: `✅ Plano ${grantForm.plan} liberado para ${j.granted_to}!`, type: "ok" });
      setGrantForm({ email: "", plan: "estudante", durationDays: 30, canUseImages: false, overrideMessages: "", overrideLaudos: "" });
      fetchData();
    } catch { setGrantMsg({ text: "Erro de conexão.", type: "err" }); }
    finally { setGrantLoading(false); }
  }

  const filteredUsers = (data?.users || []).filter(u => {
    const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  const s = data?.summary;

  if (loading) return (
    <main style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 20% 50%, #0a1f0e 0%, #050d08 60%, #020608 100%)", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 0 40px rgba(74,222,128,0.4)", animation: "spin 2s linear infinite" }}>🌱</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, letterSpacing: "0.15em" }}>CARREGANDO PAINEL...</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  if (error) return (
    <main style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 20% 50%, #0a1f0e 0%, #050d08 60%, #020608 100%)", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>{error}</div>
      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Acesso restrito ao proprietário do sistema</div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 10% 0%, #071a0e 0%, #040c07 50%, #020608 100%)", color: "white", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* HEADER */}
      <header style={{ borderBottom: "1px solid rgba(74,222,128,0.12)", background: "rgba(4,12,7,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #166534, #065f46)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 20px rgba(74,222,128,0.2)" }}>🌱</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Agro<span style={{ color: "#4ade80" }}>Mentor</span> <span style={{ color: "#67e8f9", fontSize: 12 }}>IA</span></div>
              <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, letterSpacing: "0.1em" }}>👑 PAINEL OWNER</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{data?.currentUserEmail}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 20, padding: "5px 12px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
              <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, letterSpacing: "0.05em" }}>MODO DEUS ATIVO</span>
            </div>
            <button onClick={fetchData} style={{ padding: "7px 14px", borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>↻ Atualizar</button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {[
            { key: "overview", label: "📊 Visão Geral" },
            { key: "users", label: `👥 Usuários (${data?.users?.length ?? 0})` },
            { key: "grant", label: "🔑 Liberar Acesso" },
            { key: "health", label: "💚 Health Check" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.key ? "#4ade80" : "transparent"}`, color: activeTab === tab.key ? "#4ade80" : "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: activeTab === tab.key ? 700 : 400, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em", transition: "all 0.2s" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px" }}>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* STATS CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Usuários Totais", value: s?.total_users ?? 0, icon: "👥", color: "#4ade80", bg: "rgba(74,222,128,0.08)" },
                { label: "Pagantes Ativos", value: s?.active_paid ?? 0, icon: "💰", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
                { label: "Usando Imagem", value: s?.using_images ?? 0, icon: "📷", color: "#67e8f9", bg: "rgba(103,232,249,0.08)" },
                { label: "Mensagens Enviadas", value: s?.total_messages_used ?? 0, icon: "💬", color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
                { label: "Laudos Gerados", value: s?.total_laudos_used ?? 0, icon: "📄", color: "#86efac", bg: "rgba(134,239,172,0.08)" },
                { label: "Perfis Pendentes", value: s?.pending_profiles ?? 0, icon: "⏳", color: "#fb923c", bg: "rgba(251,146,60,0.08)" },
                { label: "Custo Total API", value: `$${((s as any)?.total_cost_usd || 0).toFixed(2)}`, icon: "💵", color: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
              ].map(card => (
                <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.color}22`, borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 24 }}>{card.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value.toLocaleString("pt-BR")}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}>{card.label.toUpperCase()}</div>
                </div>
              ))}
            </div>

            {/* LOGS RECENTES */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em", marginBottom: 16 }}>⚡ LOGS RECENTES DO SISTEMA</div>
              {logs.length === 0 && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Nenhum log recente</div>}
              {logs.slice(0, 10).map((log: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < Math.min(logs.length, 10) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ fontSize: 14, marginTop: 1 }}>{log.level === "error" ? "🔴" : log.level === "warn" ? "🟡" : "🟢"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "#67e8f9", fontWeight: 600, fontFamily: "monospace" }}>{log.source}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{log.user_email || ""}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{log.message}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div>
            {/* FILTERS */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Buscar por e-mail ou nome..."
                style={{ flex: 1, minWidth: 240, padding: "10px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 12, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
                <option value="all">Todos os planos</option>
                {Object.keys(PLAN_LABELS).map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
              </select>
            </div>

            {/* TABLE */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr", gap: 0, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["USUÁRIO", "PERFIL", "PLANO", "MENSAGENS", "LAUDOS", "CUSTO API", "ÚLTIMO ACESSO", "AÇÃO"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Nenhum usuário encontrado</div>
              )}

              {filteredUsers.map((u, i) => {
                const msgPct = u.messages_limit > 0 ? Math.min(100, Math.round((u.messages_used / u.messages_limit) * 100)) : 0;
                const laudoPct = u.laudos_limit > 0 ? Math.min(100, Math.round((u.laudos_used / u.laudos_limit) * 100)) : 0;
                const planColor = PLAN_COLORS[u.plan] || "#6b7280";

                return (
                  <div key={u.user_id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 0.8fr 1fr 0.7fr", gap: 0, padding: "14px 20px", borderBottom: i < filteredUsers.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center", transition: "background 0.15s" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.full_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    </div>
                    <div style={{ fontSize: 13 }}>{PROFILE_ICONS[u.profile_type] || "❓"} <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{u.profile_type}</span></div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: planColor, background: `${planColor}15`, padding: "3px 8px", borderRadius: 6, border: `1px solid ${planColor}30` }}>
                        {PLAN_LABELS[u.plan] || u.plan}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{u.messages_used}/{u.messages_limit}</div>
                      <div style={{ width: "80%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${msgPct}%`, background: msgPct > 80 ? "#f87171" : "#4ade80", borderRadius: 2 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>{u.laudos_used}/{u.laudos_limit}</div>
                      <div style={{ width: "80%", height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${laudoPct}%`, background: laudoPct > 80 ? "#f87171" : "#67e8f9", borderRadius: 2 }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                        {(u.cost?.estimated_cost_usd ?? 0) > 0 ? `$${(u.cost?.estimated_cost_usd ?? 0).toFixed(4)}` : "—"}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        {u.cost?.messages || 0}msg {u.cost?.images || 0}img
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString("pt-BR") : "—"}</div>
                    <div>
                      <button onClick={() => { setGrantForm(f => ({ ...f, email: u.email })); setActiveTab("grant"); }}
                        style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRANT TAB */}
        {activeTab === "grant" && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 20, padding: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "white" }}>🔑 Liberar Acesso Manual</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Conceda ou altere o plano de qualquer usuário cadastrado.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>E-MAIL DO USUÁRIO *</label>
                  <input value={grantForm.email} onChange={e => setGrantForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="usuario@email.com"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>PLANO</label>
                  <select value={grantForm.plan} onChange={e => setGrantForm(f => ({ ...f, plan: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", boxSizing: "border-box" }}>
                    {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: "#071a0e" }}>{v}</option>)}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>DURAÇÃO (DIAS)</label>
                    <input type="number" value={grantForm.durationDays} onChange={e => setGrantForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>IMAGEM LIBERADA</label>
                    <button onClick={() => setGrantForm(f => ({ ...f, canUseImages: !f.canUseImages }))}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: grantForm.canUseImages ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${grantForm.canUseImages ? "rgba(74,222,128,0.3)" : "rgba(74,222,128,0.15)"}`, color: grantForm.canUseImages ? "#4ade80" : "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, boxSizing: "border-box" }}>
                      {grantForm.canUseImages ? "✅ Sim" : "❌ Não"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>OVERRIDE MENSAGENS</label>
                    <input type="number" value={grantForm.overrideMessages} onChange={e => setGrantForm(f => ({ ...f, overrideMessages: e.target.value }))}
                      placeholder="Padrão do plano"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>OVERRIDE LAUDOS</label>
                    <input type="number" value={grantForm.overrideLaudos} onChange={e => setGrantForm(f => ({ ...f, overrideLaudos: e.target.value }))}
                      placeholder="Padrão do plano"
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                </div>

                {grantMsg && (
                  <div style={{ padding: "12px 16px", borderRadius: 12, background: grantMsg.type === "ok" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${grantMsg.type === "ok" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, color: grantMsg.type === "ok" ? "#4ade80" : "#f87171", fontSize: 13 }}>
                    {grantMsg.text}
                  </div>
                )}

                <button onClick={handleGrant} disabled={grantLoading}
                  style={{ padding: "14px", borderRadius: 14, background: grantLoading ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #16a34a, #0e7490)", border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: grantLoading ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: grantLoading ? "none" : "0 0 30px rgba(74,222,128,0.2)", transition: "all 0.2s" }}>
                  {grantLoading ? "Liberando..." : "🔑 Liberar Acesso"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === "health" && health && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", marginBottom: 16 }}>⚙️ VARIÁVEIS DE AMBIENTE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {Object.entries(health.env || {}).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: val ? "rgba(74,222,128,0.04)" : "rgba(248,113,113,0.04)", border: `1px solid ${val ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)"}` }}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.65)" }}>{key}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: val ? "#4ade80" : "#f87171" }}>{val ? "✅ OK" : "❌ FALTANDO"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", marginBottom: 16 }}>🗄️ CONTAGENS DO BANCO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {Object.entries(health.counts || {}).map(([key, val]) => (
                  <div key={key} style={{ padding: "16px", borderRadius: 12, background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>{String(val)}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.05em" }}>{key.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "right" }}>
                Última checagem: {health.checked_at ? new Date(health.checked_at).toLocaleString("pt-BR") : "—"}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(74,222,128,0.2); border-radius: 2px; }
        option { background: #071a0e; color: white; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        textarea::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </main>
  );
}
