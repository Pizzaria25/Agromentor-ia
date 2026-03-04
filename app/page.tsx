<<<<<<< HEAD
"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Role = "user" | "assistant" | "system";
type ChatMsg = { role: Role; content: string };

type TabKey = "CULTURAS" | "ANIMAIS" | "APICULTURA";

const MAX_DIAG_SELECT = 3;

// ====== PRO (simulação) ======
type PlanKey = "FREE" | "PRO";
const PRO_PRICE = 129; // R$ 129/mês (simulação)
const FREE_LIMIT = 30;
const PRO_LIMIT = 300;

type ArchiveSession = {
  id: string;
  ts: number;
  title: string;
  messages: ChatMsg[];
};

const DIAG_OPTIONS: Record<TabKey, { group: string; items: string[] }[]> = {
  CULTURAS: [
    {
      group: "Cana-de-açúcar",
      items: [
        "Falhas de brotação / falta de stand",
        "Mato / invasoras (daninhas)",
        "Pragas (broca, cigarrinha, etc.)",
        "Doenças (manchas, ferrugem, etc.)",
        "Nutrição (amarelecimento/deficiência)",
        "Água/clima (seca, encharcamento, stress)",
      ],
    },
    {
      group: "Soja / Milho / Grãos",
      items: [
        "Mato / invasoras (daninhas)",
        "Pragas (lagartas, percevejo, etc.)",
        "Doenças (ferrugem, manchas, etc.)",
        "Nutrição (deficiência, vigor baixo)",
        "Plantio (população, emergência irregular)",
        "Água/clima (seca, excesso de chuva)",
      ],
    },
    {
      group: "Pastagem",
      items: [
        "Capim fraco / baixa lotação",
        "Mato / invasoras (daninhas)",
        "Solo (compactação / erosão)",
        "Pragas (cigarrinha, etc.)",
        "Reforma / recuperação de pasto",
      ],
    },
    {
      group: "Horti / Café / Citros",
      items: ["Pragas", "Doenças", "Nutrição", "Irrigação / manejo de água", "Produção baixa / queda de flores/frutos"],
    },
  ],
  ANIMAIS: [
    {
      group: "Bovinos (gado)",
      items: [
        "Gado magro / perda de peso",
        "Diarreia / fezes alteradas",
        "Tosse / respiração difícil",
        "Carrapato / parasitas",
        "Problema de casco / manqueira",
        "Reprodução (cio, prenhez, bezerro fraco)",
      ],
    },
    {
      group: "Suínos (porcos)",
      items: ["Diarreia", "Baixo ganho de peso", "Tosse / problemas respiratórios", "Lesões de pele / sarna", "Mortalidade de leitões"],
    },
    {
      group: "Aves (galinha/frango)",
      items: ["Queda de postura", "Mortalidade / apatia", "Problemas respiratórios", "Diarreia", "Parasitas (piolho/ácaro)"],
    },
    {
      group: "Ovinos/Caprinos",
      items: ["Verminose / anemia", "Perda de peso", "Diarreia", "Feridas / bicheira", "Problema de casco"],
    },
    {
      group: "Equinos (cavalos)",
      items: ["Cólica / dor abdominal", "Perda de peso", "Manqueira", "Parasitas", "Feridas / dermatites"],
    },
  ],
  APICULTURA: [
    {
      group: "Colmeias",
      items: [
        "Colmeia fraca / pouca abelha",
        "Abelha morta na frente da caixa",
        "Pouco mel / baixa produção",
        "Agressividade fora do normal",
        "Formigas / inimigos naturais",
        "Enxameação / abandono",
      ],
    },
    {
      group: "Ambiente",
      items: [
        "Falta de florada / alimento",
        "Suspeita de intoxicação (defensivos)",
        "Calor excessivo / ventilação ruim",
        "Água distante / falta de água",
        "Barulho / movimentação intensa próximo",
      ],
    },
  ],
};

function saveLS(key: string, value: any) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeLoad(key: string): any {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function uid() {
  return Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);
}

function firstUserSnippet(messages: ChatMsg[]) {
  const first = messages.find((m) => m.role === "user" && m.content.trim().length > 0);
  if (!first) return "Caso sem título";
  const t = first.content.replace(/\s+/g, " ").trim();
  return t.length > 44 ? t.slice(0, 44) + "…" : t;
}

// ====== sanitizers (evita crash por LS ruim) ======
function sanitizePlan(v: any): PlanKey {
  return v === "PRO" ? "PRO" : "FREE";
}
function sanitizeNumber(v: any, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function isChatMsg(x: any): x is ChatMsg {
  return x && (x.role === "user" || x.role === "assistant" || x.role === "system") && typeof x.content === "string";
}
function sanitizeMessages(v: any, fallback: ChatMsg[]): ChatMsg[] {
  if (!Array.isArray(v)) return fallback;
  const msgs = v.filter(isChatMsg);
  return msgs.length ? msgs : fallback;
}
function sanitizeArchives(v: any): ArchiveSession[] {
  if (!Array.isArray(v)) return [];
  const ok = v.filter(
    (x) =>
      x &&
      typeof x.id === "string" &&
      typeof x.ts === "number" &&
      typeof x.title === "string" &&
      Array.isArray(x.messages) &&
      x.messages.every(isChatMsg)
  );
  return ok;
}

// ====== Render “premium” da resposta (cards) ======
type Parsed = {
  intro?: string;
  resumo?: string;
  hipoteses?: string[];
  agora?: string[];
  semanas?: string[];
  prevencao?: string[];
  perguntas?: string[];
};

function parseAssistant(text: string): Parsed | null {
  const t = (text || "").trim();
  if (!t) return null;

  const out: Parsed = {};
  const lines = t.split("\n");

  const idxIntro = lines.findIndex((l) => l.toLowerCase().includes("explica") && l.includes("**"));
  if (idxIntro >= 0) {
    const idx1 = lines.findIndex((l) => l.trim().startsWith("1)"));
    if (idx1 > idxIntro) out.intro = lines.slice(idxIntro, idx1).join("\n").trim();
  }

  const sectionText = t;

  const getBetween = (a: RegExp, b?: RegExp) => {
    const ma = sectionText.match(a);
    if (!ma || ma.index == null) return "";
    const start = ma.index + ma[0].length;
    const rest = sectionText.slice(start);
    if (!b) return rest.trim();
    const mb = rest.match(b);
    if (!mb || mb.index == null) return rest.trim();
    return rest.slice(0, mb.index).trim();
  };

  const resumo = getBetween(/1\)\s*\*\*Resumo[^*]*\*\*:\s*/i, /\n\s*2\)\s*\*\*Hip/i);
  if (resumo) out.resumo = resumo;

  const hipRaw = getBetween(/\n\s*2\)\s*\*\*Hip[^*]*\*\*:\s*/i, /\n\s*3\)\s*\*\*Plano/i);
  if (hipRaw) {
    out.hipoteses = hipRaw
      .split("\n")
      .map((x) => x.replace(/^\s*[-•]\s*/, "").trim())
      .filter(Boolean);
  }

  const planoRaw = getBetween(/\n\s*3\)\s*\*\*Plano[^*]*\*\*:\s*/i, /\n\s*4\)\s*\*\*/i);
  if (planoRaw) {
    const a1 = planoRaw.split(/- \*\*Agora/i);
    if (a1.length > 1) {
      const rest = a1[1];
      const a2 = rest.split(/- \*\*Pr[óo]ximas/i);
      const agoraBlock = (a2[0] || "").trim();
      out.agora = agoraBlock
        .split("\n")
        .map((x) => x.replace(/^\s*[-•]\s*/, "").trim())
        .filter(Boolean);

      if (a2.length > 1) {
        const rest2 = a2[1];
        const a3 = rest2.split(/- \*\*Preven/i);
        const semanasBlock = (a3[0] || "").trim();
        out.semanas = semanasBlock
          .split("\n")
          .map((x) => x.replace(/^\s*[-•]\s*/, "").trim())
          .filter(Boolean);

        if (a3.length > 1) {
          const prevBlock = (a3[1] || "").trim();
          out.prevencao = prevBlock
            .split("\n")
            .map((x) => x.replace(/^\s*[-•]\s*/, "").trim())
            .filter(Boolean);
        }
      }
    }
  }

  const pergRaw = getBetween(/\n\s*4\)\s*\*\*.*perguntas[^*]*\*\*:\s*/i);
  if (pergRaw) {
    out.perguntas = pergRaw
      .split("\n")
      .map((x) => x.replace(/^\s*\d+\.\s*/, "").trim())
      .filter(Boolean);
  }

  const hasAny =
    out.intro ||
    out.resumo ||
    (out.hipoteses && out.hipoteses.length) ||
    (out.agora && out.agora.length) ||
    (out.perguntas && out.perguntas.length);

  return hasAny ? out : null;
}

function Card({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-400/20">{icon}</span>
        {title}
      </div>
      <div className="text-sm text-white/80">{children}</div>
    </div>
  );
}

export default function Page() {
  const baseWelcome: ChatMsg[] = [
    { role: "assistant", content: "E aí! Eu sou o AgroMentor 🌱\nMe conta: qual cultura/animal e o que está acontecendo no campo?" },
  ];

  // ✅ SEM localStorage no initializer (evita hydration/ordem de hooks)
  const [plan, setPlan] = useState<PlanKey>("FREE");
  const isPro = plan === "PRO";

  const [messages, setMessages] = useState<ChatMsg[]>(baseWelcome);
  const [archives, setArchives] = useState<ArchiveSession[]>([]);
  const [input, setInput] = useState("");

  // placeholder dinâmico
  const placeholders = [
    'Ex: "Cana 4º corte com mamona em reboleiras, após chuva..."',
    'Ex: "Gado magro: pasto fraco + sal mineral, quanto tempo?"',
    'Ex: "Abelhas morrendo na frente da caixa após pulverização..."',
    'Ex: "Pastagem falhando: solo compactado e muita invasora..."',
  ];
  const [phIndex, setPhIndex] = useState(0);

  const [loading, setLoading] = useState(false);

  // uso do mês
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT;
  const [remaining, setRemaining] = useState<number>(FREE_LIMIT);

  // Diagnóstico modal
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagTab, setDiagTab] = useState<TabKey>("CULTURAS");
  const [diagSelected, setDiagSelected] = useState<string[]>([]);
  const [diagNote, setDiagNote] = useState("");

  // PRO modal (simulação)
  const [proOpen, setProOpen] = useState(false);

  // Casos modal
  const [casesOpen, setCasesOpen] = useState(false);

  // Chips / sugestões
  const quickChips = [
    { label: "🌾 Cana com mato (daninhas)", text: "Cana: mato/invasoras em reboleiras. Estágio/corte: __. O que fazer agora?" },
    { label: "🐄 Gado magro", text: "Bovinos: gado magro/perda de peso. Pasto/suplemento: __. Há quanto tempo?" },
    { label: "🐝 Abelhas morrendo", text: "Apicultura: abelhas mortas na frente da caixa. Suspeita de defensivos? Clima? Detalhes: __." },
    { label: "🌱 Pastagem fraca", text: "Pastagem: capim fraco/baixa lotação + invasoras. Solo compactado? Chuva? Manejo: __." },
  ];

  // ✅ Carrega TUDO do localStorage depois do primeiro render
  useEffect(() => {
    const p = sanitizePlan(safeLoad("agromentor_plan_v1"));
    setPlan(p);

    const lim = p === "PRO" ? PRO_LIMIT : FREE_LIMIT;

    const loadedMessages = sanitizeMessages(safeLoad("agromentor_messages_v3"), baseWelcome);
    setMessages(loadedMessages);

    const loadedArchives = sanitizeArchives(safeLoad("agromentor_archives_v1"));
    setArchives(loadedArchives);

    const loadedRemaining = clamp(sanitizeNumber(safeLoad("agromentor_remaining_v2"), lim), 0, lim);
    setRemaining(loadedRemaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // placeholder rotativo
  useEffect(() => {
    const id = window.setInterval(() => setPhIndex((p) => (p + 1) % placeholders.length), 6000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistências
  useEffect(() => saveLS("agromentor_messages_v3", messages), [messages]);
  useEffect(() => saveLS("agromentor_archives_v1", archives), [archives]);
  useEffect(() => saveLS("agromentor_remaining_v2", remaining), [remaining]);

  // Plano: salva e ajusta limite sem apagar histórico
  useEffect(() => {
    saveLS("agromentor_plan_v1", plan);
    const newLimit = plan === "PRO" ? PRO_LIMIT : FREE_LIMIT;
    setRemaining((r) => {
      if (r === 0) return newLimit;
      return clamp(r, 0, newLimit);
    });
  }, [plan]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, loading]);

  const usagePct = useMemo(() => {
    const total = limit;
    const used = total - clamp(remaining, 0, total);
    return total <= 0 ? 0 : Math.round((used / total) * 100);
  }, [remaining, limit]);

  async function callChat(newMessages: ChatMsg[]) {
    if (remaining <= 0) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isPro
            ? "Você atingiu o limite do mês. (Simulação) Ajuste o limite PRO ou renove o mês."
            : "Você atingiu o limite grátis do mês. Ative o PRO (simulação) para liberar mais consultas.",
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      const reply = String(data?.reply || "Sem resposta.");

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Erro ao falar com a IA. Tenta novamente em instantes." }]);
    } finally {
      setLoading(false);
    }
  }

  async function sendUserMessage(text: string) {
    const clean = (text || "").trim();
    if (!clean) return;

    const next: ChatMsg[] = [...messages, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    await callChat(next);
  }

  // ✅ Antes de limpar, arquiva o caso
  function archiveCurrentSession() {
    const hasUser = messages.some((m) => m.role === "user" && m.content.trim().length > 0);
    if (!hasUser) return;

    const session: ArchiveSession = {
      id: uid(),
      ts: Date.now(),
      title: firstUserSnippet(messages),
      messages,
    };
    setArchives((prev) => [session, ...prev].slice(0, 50));
  }

  function clearChat() {
    archiveCurrentSession();
    setMessages(baseWelcome);
    setRemaining(limit);
  }

  // ===== Diagnóstico =====
  function toggleDiagPick(item: string) {
    setDiagSelected((prev) => {
      const exists = prev.includes(item);
      if (exists) return prev.filter((x) => x !== item);
      if (prev.length >= MAX_DIAG_SELECT) return prev;
      return [...prev, item];
    });
  }

  function diagLimitHint() {
    if (diagSelected.length >= MAX_DIAG_SELECT) {
      return `Você já selecionou ${MAX_DIAG_SELECT}. Remova uma opção para escolher outra.`;
    }
    return `Selecione de 1 até ${MAX_DIAG_SELECT} opções.`;
  }

  async function runDiagnosis() {
    if (diagSelected.length === 0) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Para gerar o diagnóstico, selecione pelo menos 1 opção no Diagnóstico." }]);
      setDiagOpen(false);
      return;
    }

    const header = diagTab === "CULTURAS" ? "DIAGNÓSTICO (CULTURA)" : diagTab === "ANIMAIS" ? "DIAGNÓSTICO (ANIMAIS)" : "DIAGNÓSTICO (APICULTURA)";

    const crafted = `${header}
Seleções: ${diagSelected.join(" | ")}
Detalhes extras (se houver): ${diagNote.trim() || "não informado"}

Regras:
- Faça diagnóstico inicial objetivo.
- Dê plano de ação prático por prioridade (barato antes do caro).
- Faça 3 perguntas para fechar o diagnóstico.
- Se faltar dado, NÃO enrolar: dê ação segura agora + o que coletar.
`;

    setDiagOpen(false);
    setDiagSelected([]);
    setDiagNote("");
    await sendUserMessage(crafted);
  }

  async function explainEasier(lastAssistantText: string) {
    const crafted =
      "EXPLIQUE MAIS FÁCIL:\nReescreva a resposta anterior em linguagem bem simples, passo a passo, para produtor com pouca escolaridade. Não perca as ações práticas.\n\nResposta anterior:\n" +
      lastAssistantText;
    await sendUserMessage(crafted);
  }

  async function generateLaudo(lastAssistantText: string) {
    if (!isPro) {
      setProOpen(true);
      return;
    }
    const crafted =
      "LAUDO TÉCNICO (PRO):\nGere um laudo técnico objetivo, em português Brasil, com: identificação do caso, sintomas, hipóteses, plano de ação, materiais/checagens, riscos, e recomendações finais. Sem dose numérica. Estruture em tópicos.\n\nBase:\n" +
      lastAssistantText;
    await sendUserMessage(crafted);
  }

  function loadCase(c: ArchiveSession) {
    setMessages(c.messages);
    setCasesOpen(false);
  }

  function deleteCase(id: string) {
    setArchives((prev) => prev.filter((x) => x.id !== id));
  }

  function formatDate(ts: number) {
    const d = new Date(ts);
    return d.toLocaleString();
  }

  function renderAssistantMessage(content: string) {
    const parsed = parseAssistant(content);
    if (!parsed) return <div className="whitespace-pre-wrap">{content}</div>;

    return (
      <div className="space-y-3">
        {parsed.intro && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-white/85 whitespace-pre-wrap">{parsed.intro}</div>
        )}

        {parsed.resumo && <Card title="Resumo" icon="📌">{parsed.resumo}</Card>}

        {parsed.hipoteses?.length ? (
          <Card title="Hipóteses prováveis" icon="🧠">
            <ul className="list-disc pl-5 space-y-1">
              {parsed.hipoteses.slice(0, 7).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {parsed.agora?.length ? (
          <Card title="Agora (hoje/semana)" icon="⚡">
            <ul className="list-disc pl-5 space-y-1">
              {parsed.agora.slice(0, 8).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {parsed.semanas?.length ? (
          <Card title="Próximas 2–4 semanas" icon="🗓️">
            <ul className="list-disc pl-5 space-y-1">
              {parsed.semanas.slice(0, 8).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {parsed.prevencao?.length ? (
          <Card title="Prevenção" icon="🛡️">
            <ul className="list-disc pl-5 space-y-1">
              {parsed.prevencao.slice(0, 8).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {parsed.perguntas?.length ? (
          <Card title="Perguntas-chave" icon="❓">
            <ol className="list-decimal pl-5 space-y-1">
              {parsed.perguntas.slice(0, 5).map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="rounded-3xl border border-white/20 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                <span className="text-xl">🌱</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold">AgroMentor IA</div>
                  <span
                    className={[
                      "text-[11px] px-2 py-0.5 rounded-full border",
                      isPro ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-white/15 bg-white/5 text-white/60",
                    ].join(" ")}
                    title="Plano atual"
                  >
                    {isPro ? "PRO" : "GRÁTIS"}
                  </span>
                </div>
                <div className="text-sm text-white/70">Consultor de campo — rápido, prático e direto.</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-xs text-white/70">Uso</div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-28 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-emerald-500/80" style={{ width: `${usagePct}%` }} aria-label="Uso do mês" />
                  </div>
                  <div className="text-xs text-white/70">{remaining} restantes</div>
                </div>
              </div>

              <button
                onClick={() => setCasesOpen(true)}
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                title="Ver casos salvos"
              >
                📁 Casos
              </button>

              <button
                onClick={() => setProOpen(true)}
                className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm hover:bg-emerald-500/20 transition"
                title="Plano PRO (simulação)"
              >
                ⭐ PRO
              </button>

              <button
                onClick={clearChat}
                className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                title="Antes de limpar, salva este caso automaticamente"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="mt-3 text-sm text-white/70">
            Dica: informe <b>cultura/animal</b>, <b>estágio</b>, <b>solo</b> e <b>clima</b>.
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDiagOpen(true)}
              className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm hover:bg-emerald-500/20 transition"
              title="Abrir diagnóstico guiado"
            >
              🧪 Diagnóstico
            </button>

            <button
              disabled
              className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm opacity-50 cursor-not-allowed"
              title="Em breve: enviar foto para ajudar quando não souber o nome"
            >
              📷 Foto (em breve)
            </button>

            <div className="ml-auto hidden md:flex gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">✅ Mais prático</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">🧠 Modo simples</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">📁 Casos salvos</span>
            </div>
          </div>

          {/* Chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {quickChips.map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  setInput(c.text);
                  requestAnimationFrame(() => {
                    const el = document.getElementById("agromentor-input") as HTMLInputElement | null;
                    el?.focus();
                  });
                }}
                className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                title="Clique para preencher e editar"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="mt-5 h-[68vh] overflow-auto rounded-3xl border border-white/20 bg-white/5 p-4 backdrop-blur-md">
          <div className="space-y-4">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              const isAssistant = m.role === "assistant";
              return (
                <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[92%] sm:max-w-[72%]">
                    {!isUser && (
                      <div className="mb-1 flex items-center gap-2 text-xs text-white/60">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20">🌱</span>
                        <span>AgroMentor</span>
                      </div>
                    )}

                    <div className={["rounded-3xl border p-4", isUser ? "border-emerald-400/20 bg-emerald-500/10" : "border-white/15 bg-black/25"].join(" ")}>
                      {isAssistant ? renderAssistantMessage(m.content) : <div className="whitespace-pre-wrap">{m.content}</div>}
                    </div>

                    {isAssistant && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => explainEasier(m.content)}
                          className="rounded-2xl border border-white/15 bg-white/5 px-3 py-1 text-xs hover:bg-white/10 transition"
                        >
                          🧠 Explicar mais fácil
                        </button>

                        <button
                          onClick={() => generateLaudo(m.content)}
                          className={[
                            "rounded-2xl border px-3 py-1 text-xs transition",
                            isPro ? "border-emerald-400/25 bg-emerald-500/10 hover:bg-emerald-500/20" : "border-white/15 bg-white/5 hover:bg-white/10",
                          ].join(" ")}
                          title={isPro ? "Gerar Laudo (PRO)" : "Recurso PRO (simulação)"}
                        >
                          📄 Laudo {isPro ? "(PRO)" : "🔒"}
                        </button>

                        <button
                          onClick={() => navigator.clipboard?.writeText(m.content)}
                          className="rounded-2xl border border-white/15 bg-white/5 px-3 py-1 text-xs hover:bg-white/10 transition"
                        >
                          📋 Copiar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[92%] sm:max-w-[72%]">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/60">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/20">🌱</span>
                    <span>AgroMentor</span>
                  </div>
                  <div className="rounded-3xl border border-white/15 bg-black/25 p-4 text-sm text-white/70">
                    Digitando<span className="animate-pulse">...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div className="mt-4 rounded-3xl border border-white/20 bg-white/5 p-3 backdrop-blur-md">
          <div className="flex gap-3">
            <input
              id="agromentor-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholders[phIndex]}
              className="w-full rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-400/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!loading) sendUserMessage(input);
                }
              }}
            />
            <button
              onClick={() => sendUserMessage(input)}
              disabled={loading}
              className="rounded-2xl bg-emerald-600/70 px-6 py-3 text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
            >
              {loading ? "..." : "Enviar"}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-white/60">
            <div>Uso do mês</div>
            <div>
              {remaining} restantes •{" "}
              {isPro ? (
                <span className="text-emerald-200">PRO</span>
              ) : (
                <button className="underline hover:text-white" onClick={() => setProOpen(true)}>
                  Ativar PRO (simulação)
                </button>
              )}
            </div>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-500/80" style={{ width: `${usagePct}%` }} />
          </div>
        </div>
      </div>

      {/* Diagnóstico Modal */}
      {diagOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-white/20 bg-[#0b1117]/95 p-5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">🧪 Diagnóstico guiado</div>
                <div className="mt-1 text-sm text-white/70">{diagLimitHint()}</div>
              </div>
              <button
                onClick={() => setDiagOpen(false)}
                className="rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(["CULTURAS", "ANIMAIS", "APICULTURA"] as TabKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setDiagTab(k)}
                  className={[
                    "rounded-2xl px-4 py-2 text-sm border transition",
                    diagTab === k ? "border-emerald-400/30 bg-emerald-500/15" : "border-white/15 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {k === "CULTURAS" ? "🌾 Culturas" : k === "ANIMAIS" ? "🐄 Animais" : "🐝 Apicultura"}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[45vh] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="space-y-4">
                {DIAG_OPTIONS[diagTab].map((sec) => (
                  <div key={sec.group}>
                    <div className="mb-2 text-sm font-semibold text-white/80">{sec.group}</div>
                    <div className="flex flex-wrap gap-2">
                      {sec.items.map((it) => {
                        const active = diagSelected.includes(it);
                        const disabled = !active && diagSelected.length >= MAX_DIAG_SELECT;
                        return (
                          <button
                            key={it}
                            onClick={() => toggleDiagPick(it)}
                            disabled={disabled}
                            className={[
                              "rounded-2xl border px-3 py-2 text-xs transition",
                              active ? "border-emerald-400/40 bg-emerald-500/15" : "border-white/15 bg-white/5 hover:bg-white/10",
                              disabled ? "opacity-40 cursor-not-allowed" : "",
                            ].join(" ")}
                          >
                            {active ? "✅ " : ""}
                            {it}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-white/70 mb-2">(Opcional) Detalhes rápidos: estágio, tempo do problema, área/reboleira, clima, manejo.</div>
              <textarea
                value={diagNote}
                onChange={(e) => setDiagNote(e.target.value)}
                rows={3}
                placeholder="Ex: começou há 10 dias, reboleiras perto do carreador, após chuva forte..."
                className="w-full rounded-2xl border border-white/15 bg-black/20 p-3 text-sm outline-none focus:border-emerald-400/40"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-white/60">
                Selecionadas: <b className="text-white/80">{diagSelected.length}</b> / {MAX_DIAG_SELECT}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDiagSelected([]);
                    setDiagNote("");
                  }}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                >
                  Limpar seleção
                </button>

                <button onClick={runDiagnosis} className="rounded-2xl bg-emerald-600/80 px-5 py-2 text-sm font-semibold hover:bg-emerald-600 transition">
                  Gerar diagnóstico
                </button>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-white/50">
              *O diagnóstico é um atalho: se o produtor não souber explicar, ele escolhe os sintomas e a IA responde com mais precisão.
            </div>
          </div>
        </div>
      )}

      {/* Casos Modal */}
      {casesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-white/20 bg-[#0b1117]/95 p-5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">📁 Casos salvos</div>
                <div className="mt-1 text-sm text-white/70">
                  Ao clicar em <b>Limpar</b>, o chat salva automaticamente o caso aqui.
                </div>
              </div>
              <button onClick={() => setCasesOpen(false)} className="rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition">
                Fechar
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              {archives.length === 0 ? (
                <div className="text-sm text-white/70 p-4">Nenhum caso salvo ainda. Use o chat e clique em “Limpar” para salvar.</div>
              ) : (
                <div className="space-y-2">
                  {archives.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white/85">{c.title}</div>
                          <div className="text-xs text-white/55">
                            {formatDate(c.ts)} • {c.messages.length} msgs
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadCase(c)}
                            className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs hover:bg-emerald-500/20 transition"
                          >
                            Abrir
                          </button>
                          <button
                            onClick={() => deleteCase(c.id)}
                            className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs hover:bg-white/10 transition"
                          >
                            Apagar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-white/50">Dica: isso já é um diferencial de app PRO (organiza atendimentos por “casos”).</div>
          </div>
        </div>
      )}

      {/* PRO Modal (Simulação de pagamento) */}
      {proOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-[#0b1117]/95 p-5 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">⭐ AgroMentor PRO</div>
                <div className="mt-1 text-sm text-white/70">
                  Simulação: mostra valores, mas <b>não leva para pagamento</b>.
                </div>
              </div>

              <button onClick={() => setProOpen(false)} className="rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition">
                Fechar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/85">Plano PRO</div>
                  <div className="text-xs text-white/60">Para cobrar acima de R$100/mês com valor real</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-200">R$ {PRO_PRICE}</div>
                  <div className="text-xs text-white/60">/ mês</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-white/75">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">✅ Limite maior de consultas: <b>{PRO_LIMIT}/mês</b></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">✅ 📁 Casos salvos e retomada de atendimentos</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">✅ 🧠 Explicar mais fácil sem “pesar” o produtor</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">✅ 📄 Laudo técnico (PRO) — formato pronto para enviar</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">✅ 🧪 Diagnóstico guiado com múltipla seleção (até 3)</div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">🔜 📷 Foto (quando vocês ligarem)</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-white/60">
                Status: {isPro ? <span className="text-emerald-200 font-semibold">PRO ATIVO</span> : <span className="text-white/70">Grátis</span>}
              </div>

              <div className="flex gap-2">
                {isPro ? (
                  <button
                    onClick={() => {
                      setPlan("FREE");
                      setProOpen(false);
                    }}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                  >
                    Voltar para Grátis
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setPlan("PRO");
                      setRemaining(PRO_LIMIT);
                      setProOpen(false);
                      setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: "⭐ PRO (simulação) ativado! Laudo e limite maior liberados. Depois a gente pluga o pagamento de verdade." },
                      ]);
                    }}
                    className="rounded-2xl bg-emerald-600/80 px-5 py-2 text-sm font-semibold hover:bg-emerald-600 transition"
                  >
                    Ativar PRO (simulação)
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-white/50">Depois: a gente troca esse botão por checkout (Pix/cartão) e valida no backend.</div>
          </div>
        </div>
      )}
    </div>
  );
}
=======
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Index() {
  const user = await getUser();
  redirect(user ? "/dashboard" : "/login");
}
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
