"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "assistant" | "user"; content: string };

type UsageStatus =
  | { plan: string; remaining: number; limit: number; used?: number }
  | { error: string };

function Bars({ remaining, limit }: { remaining: number; limit: number }) {
  const totalBars = 12; // elegante
  const ratio = limit > 0 ? Math.max(0, Math.min(1, remaining / limit)) : 1;
  const filled = Math.round(ratio * totalBars);

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-white/60">Energia IA</div>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: totalBars }).map((_, i) => {
          const on = i < filled;
          const h = 6 + i; // efeito de barras crescendo
          return (
            <div
              key={i}
              className={
                "w-1 rounded-sm " +
                (on ? "bg-emerald-400" : "bg-white/15")
              }
              style={{ height: h }}
              title={`${remaining}/${limit}`}
            />
          );
        })}
      </div>
      <div className="text-xs text-white/60">
        {remaining}/{limit}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Eu sou o AgroMentor IA 🌱\nMe diga a cultura/atividade (ex.: cana, soja, pastagem, gado) e descreva o problema.\n\nDica: se quiser previsão, diga a cidade (ex.: 'previsão para Ribeirão Preto - SP').",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  const canSend = useMemo(() => !loading && input.trim().length > 0, [loading, input]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/usage/status")
      .then((r) => r.json())
      .then((j) => setUsage(j))
      .catch(() => setUsage({ plan: "free", remaining: 0, limit: 0 }));
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendText(text: string) {
    const content = text.trim();
    if (!content) return;

    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, { role: "user", content }], threadId }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (json?.error === "LIMIT" || json?.error === "NO_CREDITS") {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                "⚠️ Sua energia acabou no plano FREE.\nAtive o PRO para consultas ilimitadas e laudos completos.",
            },
          ]);
        } else if (json?.error === "UNAUTH") {
          setMessages((m) => [...m, { role: "assistant", content: "Você precisa entrar para usar o AgroMentor." }]);
        } else {
          setMessages((m) => [...m, { role: "assistant", content: json?.reply || json?.error || "Erro." }]);
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", content: json.reply ?? "" }]);
        if (json?.usage) setUsage(json.usage);
        if (json?.threadId) setThreadId(json.threadId);
        if (json?.caseId) setCaseId(json.caseId);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erro de rede." }]);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (!threadId && !caseId) {
      setReportMsg("Envie ao menos 1 mensagem no chat para criar um caso automaticamente.");
      return;
    }
    setReportBusy(true);
    setReportMsg(null);

    // Observações extras: resumo do que foi conversado (ajuda o laudo quando ainda não há muitos dados)
    const transcript = messages
      .filter((m) => m.role !== "assistant" || m.content.length < 4000)
      .slice(-18)
      .map((m) => `${m.role === "user" ? "USUÁRIO" : "AGROMENTOR"}: ${m.content}`)
      .join("\n\n");

    try {
      const res = await fetch("/api/laudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: threadId ?? undefined, case_id: caseId ?? undefined, notes: transcript }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReportMsg(j?.message || j?.error || "Falha ao gerar laudo.");
        return;
      }

      // Abre a página de laudos para baixar PDF
      setReportMsg("Laudo gerado ✅ Abra a aba Laudos para baixar o PDF.");
      window.location.href = "/laudos";
    } catch {
      setReportMsg("Erro de rede ao gerar laudo.");
    } finally {
      setReportBusy(false);
    }
  }

  const quick = [
    "Cana com manchas e amarelecimento",
    "Soja com folhas manchadas (ferrugem?)",
    "Pastagem com falhas após dessecação",
    "Boi perdendo peso no pasto",
    "Previsão para Uberlândia - MG",
  ];

  const u = usage && "remaining" in usage ? usage : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AgroMentor IA</h1>
          <p className="mt-1 text-white/70">
            Diagnóstico • Agricultura de precisão • Manejo animal • Previsão do tempo • Laudos
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          {u ? <Bars remaining={u.remaining} limit={u.limit} /> : <div className="text-xs text-white/60">Carregando energia…</div>}
          {u?.plan === "free" && <div className="mt-1 text-[11px] text-white/50">Free: 21 perguntas a cada 7 dias</div>}
          {u?.plan !== "free" && u && <div className="mt-1 text-[11px] text-emerald-200">PRO: ilimitado</div>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => sendText(q)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/10 bg-white/5 shadow-soft">
          <div ref={listRef} className="h-[60vh] overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={"mb-4 flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm " +
                    (m.role === "user"
                      ? "bg-emerald-500 text-black"
                      : "bg-black/40 text-white border border-white/10")
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-white/60">Pensando…</div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSend) sendText(input);
                }}
                placeholder="Digite sua pergunta…"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-emerald-400/40"
              />
              <button
                onClick={() => sendText(input)}
                disabled={!canSend}
                className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
            <div className="mt-2 text-[11px] text-white/50">
              Para melhores respostas: informe <b>cultura</b>, <b>idade/estágio</b>, <b>local</b>, <b>histórico</b> e <b>clima</b>.
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-soft">
            <div className="text-sm font-medium">Demonstração do que o AgroMentor entrega</div>
            <div className="mt-3 space-y-3 text-sm text-white/75">
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs text-white/60">Exemplo</div>
                <div className="mt-1">“Cana amarelada em manchas após chuva”</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="text-xs text-white/60">Resposta</div>
                <div className="mt-1">Hipóteses + como confirmar + manejo + checklist de campo</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Modo PRO</div>
                <div className="mt-1 text-sm text-white/70">Ilimitado + laudos completos (PDF)</div>
              </div>
              <a
                href="/planos"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
              >
                Ver planos
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Laudo técnico</div>
                <div className="mt-1 text-sm text-white/70">
                  Gera um documento (PDF) com diagnóstico, checklist e equipamentos recomendados.
                </div>
              </div>
            </div>

            <button
              onClick={generateReport}
              disabled={reportBusy || (!threadId && !caseId)}
              className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
            >
              {reportBusy ? "Gerando…" : "Gerar laudo agora"}
            </button>

            {reportMsg && (
              <div className="mt-3 text-xs text-white/70">{reportMsg}</div>
            )}

            <div className="mt-3 text-[11px] text-white/50">
              Dica: quanto mais detalhes no chat (cultura, local, histórico, clima), melhor o laudo.
            </div>
          </div>
        </aside>
      </div>

      {/* Balão PRO */}
      <a
        href="/planos"
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg hover:bg-emerald-400"
        title="Ativar PRO"
      >
        PRO
      </a>
    </main>
  );
}
