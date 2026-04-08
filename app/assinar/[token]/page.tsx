"use client";

import { useEffect, useState } from "react";

export default function AssinarPage({ params }: { params: { token: string } }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sigName, setSigName] = useState("");
  const [sigCrea, setSigCrea] = useState("");
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => {
    fetch(`/api/assinar/${params.token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          if (j.already_signed) { setAlreadySigned(true); setError(j.error); }
          else setError(j.error);
        } else {
          setReport(j.report);
        }
      })
      .catch(() => setError("Erro ao carregar o laudo."))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleSign() {
    if (!sigName.trim() || !sigCrea.trim()) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/assinar/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signer_name: sigName, signer_crea: sigCrea, signature_type: "text" }),
      });
      const j = await res.json();
      if (res.ok) setDone(true);
      else setError(j.error || "Erro ao assinar.");
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSigning(false);
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-[#0a2e1a] flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-4xl mb-3">🌱</div>
        <div className="text-white/60">Carregando laudo…</div>
      </div>
    </main>
  );

  if (done) return (
    <main className="min-h-screen bg-[#0a2e1a] flex items-center justify-center text-white p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">Laudo co-assinado!</h1>
        <p className="text-white/70">Sua assinatura foi registrada com sucesso. O produtor será notificado e pode baixar o PDF atualizado.</p>
        <div className="mt-6 text-xs text-white/40">AgroMentor IA — Plataforma Agronômica Inteligente</div>
      </div>
    </main>
  );

  if (alreadySigned || error) return (
    <main className="min-h-screen bg-[#0a2e1a] flex items-center justify-center text-white p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">{alreadySigned ? "✅" : "⚠️"}</div>
        <h1 className="text-xl font-bold mb-2">{alreadySigned ? "Laudo já assinado" : "Link inválido"}</h1>
        <p className="text-white/60">{error}</p>
      </div>
    </main>
  );

  const content = report?.content ?? {};

  return (
    <main className="min-h-screen bg-[#0a2e1a] text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-xl">🌱</div>
          <div>
            <div className="font-bold text-lg">Agro<span className="text-emerald-400">Mentor</span> IA</div>
            <div className="text-xs text-white/50">Co-assinatura de Laudo Técnico</div>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-4 mb-6 text-sm text-amber-200">
          <strong>Um produtor solicita sua co-assinatura</strong> neste laudo técnico. Revise o conteúdo e assine abaixo com seu nome e CREA. Você não precisa ter uma conta no AgroMentor.
        </div>

        {/* Report preview */}
        <div className="bg-black/30 border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-bold text-lg text-emerald-400">{content.title ?? report.title}</h2>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-white/50">Cultura:</span> <span>{content.context?.culture ?? "—"}</span></div>
            <div><span className="text-white/50">Município:</span> <span>{content.context?.municipality ?? "—"}</span></div>
            <div><span className="text-white/50">Área:</span> <span>{content.context?.area_ha ? `${content.context.area_ha} ha` : "—"}</span></div>
            <div><span className="text-white/50">Risco:</span> <span className={content.risk_level === "ALTO" ? "text-red-400" : content.risk_level === "MEDIO" ? "text-amber-400" : "text-emerald-400"}>{content.risk_level ?? "—"}</span></div>
          </div>

          {content.summary && (
            <div>
              <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Resumo</div>
              <p className="text-sm text-white/80">{content.summary}</p>
            </div>
          )}

          {Array.isArray(content.recommendation?.immediate_actions) && (
            <div>
              <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Ações Imediatas</div>
              <ul className="text-sm text-white/80 space-y-1">
                {content.recommendation.immediate_actions.map((a: string, i: number) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-white/40 pt-2 border-t border-white/10">{content.profile_footer}</div>
        </div>

        {/* Signature form */}
        <div className="bg-black/30 border border-emerald-400/20 rounded-2xl p-5">
          <h3 className="font-bold mb-1">Sua assinatura técnica</h3>
          <p className="text-sm text-white/60 mb-4">Ao assinar, você confirma que revisou o laudo e assume corresponsabilidade técnica pelo documento.</p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Nome completo</label>
              <input
                value={sigName}
                onChange={(e) => setSigName(e.target.value)}
                placeholder="Seu nome conforme CREA"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400/40 placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">CREA (com UF e categoria)</label>
              <input
                value={sigCrea}
                onChange={(e) => setSigCrea(e.target.value)}
                placeholder="Ex: CREA-SP 123456/D"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400/40 placeholder:text-white/30"
              />
            </div>
          </div>

          {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

          <button
            onClick={handleSign}
            disabled={signing || !sigName.trim() || !sigCrea.trim()}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all disabled:opacity-50"
          >
            {signing ? "Assinando…" : "✓ Assinar e Confirmar Laudo"}
          </button>

          <p className="text-[10px] text-white/30 mt-3 text-center">
            Sua assinatura fica registrada no documento com data e hora. Este link expira após a assinatura.
          </p>
        </div>
      </div>
    </main>
  );
}
