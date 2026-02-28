"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "assistant" | "user"; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "E aí! Eu sou o AgroMentor 🌱\nMe conta: qual cultura e o que está acontecendo no campo?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Barra de uso (visual; depois ligamos com backend)
  const [used, setUsed] = useState(0);
  const limit = 30;

  const canSend = useMemo(() => !loading && input.trim().length > 0, [loading, input]);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendText(text: string) {
    const content = text.trim();
    if (!content) return;

    setLoading(true);
    setInput("");

    const nextMessages: Msg[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const reply = typeof data?.reply === "string" ? data.reply : "Não consegui responder agora.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setUsed((u) => Math.min(limit, u + 1));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Deu erro na conexão. Tenta de novo em alguns segundos." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "Fechado 🌱\nMe diz: cultura + estágio + sintoma (ex: Cana 2º corte com mucuna em reboleiras).",
      },
    ]);
  }

  return (
    <main className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {/* Wallpaper (sua imagem) */}
      <div className="absolute inset-0">
        {/* Troque o nome se sua imagem for png */}
        <div
          className="absolute inset-0 bg-center bg-cover scale-[1.03]"
          style={{ backgroundImage: "url(/wallpaper.jpg)" }}
        />
        {/* Blur + escurecer para leitura */}
        <div className="absolute inset-0 backdrop-blur-[10px] bg-black/55" />
        {/* Vinheta premium */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_85%_30%,rgba(34,197,94,0.18),transparent_35%),linear-gradient(to_bottom,rgba(0,0,0,0.25),rgba(0,0,0,0.85))]" />
        {/* Grãozinho para “cara de app” */}
        <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* App-like container (mobile first) */}
      <div className="relative mx-auto w-full max-w-3xl min-h-screen flex flex-col">
        {/* Top bar fixa (estilo app) */}
        <header className="sticky top-0 z-30">
          <div className="px-4 pt-4 pb-3 sm:pt-6 sm:px-6">
            <div className="rounded-3xl border border-white/12 bg-white/6 shadow-[0_12px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <div className="px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow">
                    <span className="text-xl">🌱</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-base sm:text-lg font-semibold">AgroMentor IA</div>
                    <div className="text-xs text-white/65">
                      Consultor de campo — rápido, prático e direto.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Uso (some no mobile muito pequeno, aparece no sm+) */}
                  <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
                    <div className="text-xs text-white/70">Uso</div>
                    <div className="w-28 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400/80"
                        style={{ width: `${(used / limit) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-white/85">{limit - used} restantes</div>
                  </div>

                  <button
                    onClick={clearChat}
                    className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 active:scale-[0.99] transition"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="px-4 pb-3 sm:px-5 text-xs text-white/60">
                Dica: informe <b>cultura</b>, <b>estágio</b>, <b>solo</b> e <b>clima</b>.
              </div>
            </div>
          </div>
        </header>

        {/* Chat ocupa a tela (app-like) */}
        <section className="flex-1 px-4 sm:px-6 pb-[110px]">
          <div
            ref={listRef}
            className="rounded-3xl border border-white/12 bg-white/6 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.55)] p-4 sm:p-6 h-full min-h-[60vh] overflow-y-auto space-y-4"
          >
            {messages.map((m, idx) => (
              <Bubble key={idx} role={m.role} text={m.content} />
            ))}

            {loading && (
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                  🌱
                </div>
                <div className="max-w-[85%] rounded-2xl bg-white/8 border border-white/12 px-4 py-3">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    Pensando no melhor manejo…
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Barra de input fixa embaixo (app-like) */}
        <footer className="fixed bottom-0 left-0 right-0 z-40">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-5">
            <div className="rounded-3xl border border-white/12 bg-black/35 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.6)] p-3 sm:p-4">
              {/* uso compacto no mobile */}
              <div className="sm:hidden mb-2 flex items-center justify-between text-xs text-white/70">
                <span>Uso do mês</span>
                <span>{limit - used} restantes</span>
              </div>
              <div className="sm:hidden mb-3 w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-emerald-400/80"
                  style={{ width: `${(used / limit) * 100}%` }}
                />
              </div>

              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendText(input);
                  }}
                  placeholder="Ex: Cana 2º corte com mucuna em reboleiras…"
                  className="flex-1 rounded-2xl bg-white/5 border border-white/12 px-4 py-3 outline-none focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/15 placeholder:text-white/35"
                />
                <button
                  onClick={() => sendText(input)}
                  disabled={!canSend}
                  className="rounded-2xl px-5 py-3 font-semibold bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-40 transition active:scale-[0.99]"
                >
                  {loading ? "..." : "Enviar"}
                </button>
              </div>

              <div className="mt-2 text-[11px] text-white/45">
                {limit - used <= 5 ? "⚠️ Uso quase no fim — plano premium libera mais." : " "}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Bubble({ role, text }: { role: "assistant" | "user"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
      {!isUser && (
        <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow">
          🌱
        </div>
      )}

      <div
        className={[
          "max-w-[85%] rounded-2xl border px-4 py-3 whitespace-pre-wrap leading-relaxed",
          isUser
            ? "bg-emerald-500/15 border-emerald-300/20"
            : "bg-white/6 border-white/12",
        ].join(" ")}
      >
        <div className="text-sm text-white/90">{text}</div>
      </div>

      {isUser && (
        <div className="h-9 w-9 rounded-2xl bg-emerald-500/15 border border-emerald-300/20 flex items-center justify-center shadow">
          🙂
        </div>
      )}
    </div>
  );
}