"use client";

import { useState } from "react";

const PLANS = [
  {
    key: "estudante", icon: "🎓", name: "Estudante", price: 14.90, priceFirst: 7.90,
    color: "#86efac", glow: "rgba(134,239,172,0.1)", border: "rgba(134,239,172,0.2)",
    messages: 100, laudos: 3, images: false, badge: null,
    scenario: "Você está na faculdade e quer praticar diagnósticos reais. Com o AgroMentor você faz diagnósticos como um agrônomo formado — ideal para TCC e estágios.",
    highlights: ["100 mensagens/mês", "3 laudos técnicos", "Histórico salvo", "Todas as culturas"],
    cta: "Começar como Estudante",
  },
  {
    key: "produtor", icon: "🌾", name: "Produtor Rural", price: 34.90, priceFirst: 17.90,
    color: "#4ade80", glow: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)",
    messages: 150, laudos: 5, images: true, badge: null,
    scenario: "Você gerencia sua propriedade e não quer esperar dias por uma visita técnica. Manda a foto da lavoura e recebe diagnóstico na hora.",
    highlights: ["150 mensagens/mês", "5 laudos com co-assinatura", "📷 Foto da lavoura", "Relatórios para o banco"],
    cta: "Começar como Produtor",
  },
  {
    key: "profissional", icon: "👨‍💼", name: "Profissional", price: 59.90, priceFirst: 29.90,
    color: "#67e8f9", glow: "rgba(103,232,249,0.1)", border: "rgba(103,232,249,0.25)",
    messages: 300, laudos: 15, images: true, badge: "🔥 Mais popular",
    scenario: "Você atende múltiplos clientes e precisa de agilidade. Com 15 laudos/mês, o plano se paga com uma única visita técnica economizada.",
    highlights: ["300 mensagens/mês", "15 laudos técnicos", "📷 Análise de imagens", "Co-assinatura digital"],
    cta: "Começar como Profissional",
  },
  {
    key: "escritorio", icon: "🏢", name: "Escritório", price: 129.90, priceFirst: 64.90,
    color: "#a78bfa", glow: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)",
    messages: 600, laudos: 50, images: true, badge: null,
    scenario: "Seu escritório atende dezenas de propriedades. 50 laudos por mês significa que cada técnico da equipe trabalha com suporte de IA o dia todo.",
    highlights: ["600 mensagens/mês", "50 laudos técnicos", "📷 Análise de imagens", "Ideal para equipes"],
    cta: "Começar com Escritório",
  },
  {
    key: "usina", icon: "🏭", name: "Usina / Corporativo", price: 449.90, priceFirst: 224.90,
    color: "#fbbf24", glow: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)",
    messages: 9999, laudos: 9999, images: true, badge: "👑 Ilimitado",
    scenario: "Para usinas e empresas que precisam de suporte agronômico em escala. Mensagens e laudos ilimitados para toda a equipe técnica.",
    highlights: ["Mensagens ilimitadas", "Laudos ilimitados", "📷 Análise de imagens", "Suporte prioritário"],
    cta: "Falar com a equipe",
  },
];

export default function PlanosPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleCheckout(plan: string) {
    if (plan === "usina") { window.location.href = "mailto:contato@agromentor.com.br?subject=Plano Usina"; return; }
    setLoading(plan); setMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      const j = await res.json();
      if (!res.ok) { setMsg(j?.error || "Erro ao iniciar checkout."); return; }
      if (j?.url) window.location.href = j.url;
    } catch { setMsg("Erro de conexão. Tente novamente."); }
    finally { setLoading(null); }
  }

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 10% 0%, #071a0e 0%, #040c07 50%, #020608 100%)", color: "white", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "40px 16px 60px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #166534, #065f46)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌱</div>
          <span style={{ fontSize: 22, fontWeight: 800 }}>Agro<span style={{ color: "#4ade80" }}>Mentor</span> <span style={{ color: "#67e8f9", fontSize: 16, fontWeight: 500 }}>IA</span></span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.2 }}>
          Escolha o plano<br />
          <span style={{ background: "linear-gradient(135deg, #4ade80, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>certo para você</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto 16px" }}>3 dias de trial grátis + 1 laudo. Sem cartão de crédito para começar.</p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 20, padding: "8px 18px" }}>
          <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>🎁 50% OFF no primeiro mês em todos os planos</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 20 }}>
        {PLANS.map((plan) => (
          <div key={plan.key} style={{ background: `linear-gradient(135deg, ${plan.glow}, rgba(255,255,255,0.01))`, border: `1px solid ${plan.border}`, borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
            {plan.badge && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: `${plan.color}20`, border: `1px solid ${plan.color}40`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: plan.color, whiteSpace: "nowrap" }}>{plan.badge}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${plan.color}15`, border: `1px solid ${plan.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{plan.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>{plan.messages === 9999 ? "ILIMITADO" : `${plan.messages} MSGS/MÊS`}</div>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>R$</span>
                <span style={{ fontSize: 36, fontWeight: 800, color: plan.color, lineHeight: 1 }}>{plan.priceFirst.toFixed(2).replace(".", ",")}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>/1º mês</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Depois R$ {plan.price.toFixed(2).replace(".", ",")}/mês</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>{plan.scenario}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.highlights.map((h) => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: plan.color, fontSize: 14 }}>▸</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{h}</span>
                </div>
              ))}
            </div>
            <button onClick={() => handleCheckout(plan.key)} disabled={loading === plan.key}
              style={{ marginTop: "auto", padding: "13px", borderRadius: 14, background: loading === plan.key ? "rgba(255,255,255,0.06)" : `${plan.color}20`, border: `1px solid ${plan.color}40`, color: plan.color, fontSize: 13, fontWeight: 700, cursor: loading === plan.key ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
              {loading === plan.key ? "Aguarde..." : plan.cta} →
            </button>
          </div>
        ))}
      </div>

      {msg && <div style={{ maxWidth: 480, margin: "20px auto 0", padding: "12px 16px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 13, textAlign: "center" }}>{msg}</div>}

      <div style={{ textAlign: "center", marginTop: 48 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>✅ Cancele quando quiser &nbsp;·&nbsp; 🔒 Pagamento seguro via Stripe &nbsp;·&nbsp; 📱 Funciona no celular</p>
        <a href="/chat" style={{ fontSize: 13, color: "rgba(74,222,128,0.6)", textDecoration: "none" }}>← Voltar ao chat</a>
      </div>
      <style>{`button:hover:not(:disabled){opacity:0.85;transform:translateY(-1px)} * { box-sizing: border-box; }`}</style>
    </main>
  );
}
