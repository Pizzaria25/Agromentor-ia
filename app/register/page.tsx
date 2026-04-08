"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_URL = "https://wa.me/5518996308001?text=Ol%C3%A1%2C+vim+pelo+AgroMentor+IA+e+tenho+uma+d%C3%BAvida";

export default function RegisterPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleRegister() {
    setMsg(null);
    if (!email || !password) { setMsg({ text: "Preencha e-mail e senha.", ok: false }); return; }
    if (password.length < 8) { setMsg({ text: "A senha deve ter no mínimo 8 caracteres.", ok: false }); return; }
    if (password !== confirm) { setMsg({ text: "As senhas não coincidem.", ok: false }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMsg({ text: "✅ Conta criada! Verifique seu e-mail para ativar o acesso.", ok: true });
    } catch (err: any) {
      setMsg({ text: err?.message ?? "Não foi possível criar a conta.", ok: false });
    } finally { setLoading(false); }
  }

  async function handleLogin() {
    setMsg(null);
    if (!email || !password) { setMsg({ text: "Preencha e-mail e senha.", ok: false }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/chat";
    } catch (err: any) {
      setMsg({ text: err?.message ?? "E-mail ou senha incorretos.", ok: false });
    } finally { setLoading(false); }
  }

  const isRegister = tab === "register";

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 0%, #071a0e 0%, #040c07 50%, #020608 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "white" }}>
      <div style={{ width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "1fr 1fr", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(74,222,128,0.12)", borderRadius: 24, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>

        {/* LEFT */}
        <div style={{ padding: "48px 40px", background: "linear-gradient(135deg, rgba(74,222,128,0.04), rgba(34,211,238,0.01))", borderRight: "1px solid rgba(74,222,128,0.08)", display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #166534, #065f46)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🌱</div>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)" }}>AGROMENTOR IA</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>
            {isRegister ? "Seu acesso começa com confiança, clareza e um passo a passo simples." : "Entre no AgroMentor IA e continue sua análise com mais segurança técnica."}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0 }}>
            {isRegister ? "Crie sua conta com seu e-mail real. Depois, confirme o link enviado para liberar o acesso ao AgroMentor IA com segurança." : "Se você acabou de criar sua conta, confirme primeiro o e-mail de liberação e depois volte para entrar normalmente."}
          </p>

          <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.12)", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>Salmos 37:5</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic", lineHeight: 1.65, margin: 0 }}>"Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará."</p>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>{isRegister ? "COMO FUNCIONA" : "ANTES DE ENTRAR"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {isRegister ? [
                "Cadastre-se com seu e-mail real.",
                "Receba o e-mail de confirmação/liberação.",
                "Clique no link enviado para ativar sua conta.",
                "Depois disso, entre normalmente no AgroMentor IA.",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 14px" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#4ade80", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{step}</span>
                </div>
              )) : [
                "Use o mesmo e-mail que você cadastrou.",
                "Se sua conta for nova, confirme o link enviado ao seu e-mail.",
                "Se não encontrou a mensagem, verifique Spam, Promoções ou Lixo eletrônico.",
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0" }}>
                  <span style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {isRegister && (
            <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 12, padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>
              <strong style={{ color: "rgba(255,255,255,0.65)" }}>Importante:</strong> se o e-mail não aparecer na caixa principal, verifique <strong style={{ color: "rgba(255,255,255,0.65)" }}>Spam</strong>, <strong style={{ color: "rgba(255,255,255,0.65)" }}>Promoções</strong> ou <strong style={{ color: "rgba(255,255,255,0.65)" }}>Lixo eletrônico.</strong> Esse e-mail faz parte do processo normal de segurança da sua conta.
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #166534, #065f46)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌱</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Agro<span style={{ color: "#4ade80" }}>Mentor</span> IA</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{isRegister ? "Cadastro com ativação por e-mail" : "Plataforma agronômica inteligente"}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 4, gap: 4 }}>
            {(["register", "login"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setMsg(null); }}
                style={{ padding: "10px", borderRadius: 10, background: tab === t ? "#4ade80" : "transparent", border: "none", color: tab === t ? "#000" : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                {t === "register" ? "Criar conta" : "Entrar"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>E-mail</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="seu@email.com"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as any }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Senha</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••••••"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as any }} />
            </div>
            {isRegister && (
              <div>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>Confirmar senha</label>
                <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="repita sua senha"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,222,128,0.15)", color: "white", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as any }} />
              </div>
            )}
          </div>

          {msg && (
            <div style={{ padding: "10px 14px", borderRadius: 12, background: msg.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${msg.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, color: msg.ok ? "#4ade80" : "#f87171", fontSize: 13, lineHeight: 1.5 }}>
              {msg.text}
            </div>
          )}

          <button onClick={isRegister ? handleRegister : handleLogin} disabled={loading}
            style={{ padding: "13px", borderRadius: 14, background: loading ? "rgba(74,222,128,0.4)" : "#4ade80", border: "none", color: "#000", fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s", boxShadow: "0 0 30px rgba(74,222,128,0.15)" }}>
            {loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
          </button>

          {isRegister && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              Seu acesso será liberado após a confirmação enviada ao seu e-mail real.
            </p>
          )}

          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            {isRegister ? "Já tem conta? " : "Não tem conta? "}
            <button onClick={() => { setTab(isRegister ? "login" : "register"); setMsg(null); }}
              style={{ background: "none", border: "none", color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {isRegister ? "Entrar agora" : "Criar agora"}
            </button>
          </p>

          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", padding: "12px", borderRadius: 14, background: "rgba(37,211,102,0.07)", border: "1px solid rgba(37,211,102,0.18)", color: "#25d366", fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", transition: "all 0.2s" }}>
            💬 {isRegister ? "Falar no WhatsApp sobre dúvidas ou plano teste" : "Atendimento no WhatsApp para dúvidas e planos teste"}
          </a>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input:focus { border-color: rgba(74,222,128,0.4) !important; }
        @media (max-width: 700px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
