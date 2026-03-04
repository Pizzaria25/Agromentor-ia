import OpenAI from "openai";
<<<<<<< HEAD

console.log("ROUTE NOVO CARREGADO ✅ v5-tech-sources");

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

/** LÊ o texto retornado pelo Responses API (SDK novo) */
=======
import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/billing";
import { consumeQuestion, getUsageStatus } from "@/lib/usage";
import { retrieveContext } from "@/lib/rag";
import { getForecast, looksLikeWeatherQuestion } from "@/lib/weather";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

/** Lê texto retornado pela Responses API */
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
function extractText(response: any): string {
  try {
    const out = response?.output ?? [];
    let text = "";
<<<<<<< HEAD
    for (const item of out) {
      const contents = item?.content ?? [];
      for (const c of contents) {
        if (c?.type === "output_text" && typeof c?.text === "string") text += c.text;
      }
    }
=======

    for (const item of out) {
      const contents = item?.content ?? [];
      for (const c of contents) {
        if (c?.type === "output_text" && typeof c?.text === "string") {
          text += c.text;
        }
      }
    }

>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
    if (!text && typeof response?.output_text === "string") text = response.output_text;
    return String(text || "").trim();
  } catch {
    return "";
  }
}

function detectCulture(text: string) {
  const t = (text || "").toLowerCase();
  if (/\bpastagem\b|\bpasto\b|\bcapim\b|\bpiquete\b|\bforrageir/.test(t)) return "PASTAGEM";
  if (/\bcanavial\b|\bcana\b|\bsoqueira\b|\bcorte\b|\btolete\b/.test(t)) return "CANA";
  if (/\bsoja\b/.test(t)) return "SOJA";
  if (/\bmilho\b/.test(t)) return "MILHO";
  if (/\balgod[aã]o\b/.test(t)) return "ALGODAO";
  if (/\bcaf[eé]\b/.test(t)) return "CAFE";
  if (/\bc[ií]tr(os|us)\b|\blaranja\b|\blimo[ãa]o\b/.test(t)) return "CITROS";
<<<<<<< HEAD
  if (/\bhort[aã]\b|\bhortali[cç]a\b|\bverdura\b|\blegume\b/.test(t)) return "HORTI";
  if (/\bapicultur|\bcolmeia|\babelha/.test(t)) return "APICULTURA";
  if (/\bgado\b|\bbovino|\bporco|\bsu[ií]no|\bgalinha|\bfrango|\bovino|\bcaprino|\bcavalo|\bequino/.test(t))
    return "ANIMAIS";
=======
  if (/\barroz\b/.test(t)) return "ARROZ";
  if (/\btrigo\b/.test(t)) return "TRIGO";
  if (/\bsorgo\b/.test(t)) return "SORGO";
  if (/\bbanana\b/.test(t)) return "BANANA";
  if (/\btomate\b|\bbatata\b|\bcebola\b|\balface\b|\bcenoura\b/.test(t)) return "HORTI";
  if (/\bbovino\b|\bboi\b|\bvaca\b|\bnovilha\b|\bbezerro\b|\bpecu[aá]ria\b/.test(t)) return "BOVINOS";
  if (/\bsu[ií]no\b|\bporco\b/.test(t)) return "SUINOS";
  if (/\bavi[cç]ultura\b|\bfrango\b|\bgalinha\b/.test(t)) return "AVES";
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
  return "GERAL";
}

function detectTheme(text: string) {
  const t = (text || "").toLowerCase();

<<<<<<< HEAD
  if (/\bdaninha\b|\bmato\b|\binvasora\b|\bmamona\b|\bmucuna\b|\bbuva\b|\bcapim-amargoso\b|\btrapoeraba\b|\bcorda-de-viola\b|\bp[eé]-de-galinha\b|\bpic[aã]o-preto\b|\bcaruru\b|\bguanxuma\b/.test(t))
    return "DANINHAS";

  if (/\bpraga\b|\bbroca\b|\bcigarrinha\b|\bpulg[aã]o\b|\bmosca\b|\blagarta\b|\bpercevejo\b|\bácaro\b|\bacaro\b/.test(t))
    return "PRAGAS";

  if (/\bdoen[cç]a\b|\bmancha\b|\bferrugem\b|\bm[oó]dio\b|\bcarv[aã]o\b|\bpodrid[aã]o\b|\bviros/.test(t))
    return "DOENCAS";

  if (/\baduba[cç][aã]o\b|\bnutriente\b|\bdefici[eê]ncia\b|\bamarel(a|ado)\b|\bclorose\b|\bcalc[aá]rio\b|\bpH\b|\bsaturação\b|\bV%\b/i.test(text))
    return "NUTRICAO";

  if (/\bseca\b|\bestresse h[ií]drico\b|\bencharc\b|\bexcesso de [aá]gua\b|\birriga[cç][aã]o\b|\bchuva\b|\bgeada\b|\bfrente fria\b/.test(t))
    return "AGUA_CLIMA";

  if (/\bdiarreia\b|\btosse\b|\brespira|\bparasita|\bcarrapato|\bmanqueira|\bcasco|\bc[oó]lica\b/.test(t))
    return "SANIDADE";
=======
  if (/\bdaninha\b|\bmato\b|\binvasora\b|\bbuva\b|\bcapim-amargoso\b|\btrapoeraba\b|\bcorda-de-viola\b/.test(t))
    return "DANINHAS";

  if (/\bpraga\b|\bbroca\b|\bcigarrinha\b|\bpulg[aã]o\b|\bmosca\b|\blagarta\b|\bpercevejo\b/.test(t))
    return "PRAGAS";

  if (/\bdoen[cç]a\b|\bmancha\b|\bferrugem\b|\bm[oó]dio\b|\bcarv[aã]o\b|\bpodrid[aã]o\b/.test(t))
    return "DOENCAS";

  if (/\baduba[cç][aã]o\b|\bnutriente\b|\bdefici[eê]ncia\b|\bamarel(a|ado)\b|\bclorose\b|\bcalc[aá]rio\b/.test(t))
    return "NUTRICAO";

  if (/\bdose\b|\bvaz[aã]o\b|\bL\/ha\b|\bcalda\b|\bfaixa\b|\baltura\b|\bvelocidade\b|\bbarra\b|\buniporte\b|\bdrone\b|\bavi[aã]o\b|\bpulveriza/.test(t))
    return "APLICACAO";

  if (/\bcusto\b|\bpre[cç]o\b|\bvi[aá]vel\b|\bretorno\b|\br\$\b|\beconomia\b|\bROI\b/.test(t))
    return "ECONOMIA";

  if (looksLikeWeatherQuestion(t)) return "CLIMA";
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)

  return "GERAL";
}

<<<<<<< HEAD
function pickFromHistory(messages: ChatMsg[], fn: (t: string) => string) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const v = fn(m.content || "");
    if (v !== "GERAL") return v;
  }
  return "GERAL";
}

/** Prompt técnico + saída em JSON (com fontes) */
function systemPrompt(culture: string, theme: string) {
  return `
Você é o AgroMentor IA (consultor técnico de campo no Brasil).
Seu padrão é TÉCNICO e PRECISO. O app tem botão "Explicar mais fácil", então NÃO simplifique por padrão.

REGRAS DE QUALIDADE:
- Não invente fatos. Se algo for incerto, marque como "Hipótese" e diga o que medir/observar para confirmar.
- Seja específico e coerente com a agronomia/veterinária de campo.
- Evite recomendações ilegais/arriscadas. Não dê dose numérica. Pode falar "conforme rótulo/bula e receituário".
- Cite FONTES confiáveis (preferir: EMBRAPA, MAPA/legislação, boletins técnicos, universidades, manuais reconhecidos).
- Quando citar, use links completos e reais quando possível. Se não lembrar link exato, cite a instituição + título do material.

TRAVAS:
- Cultura fixa: ${culture}. Não perguntar "qual cultura" e não trocar.
- Tema fixo: ${theme}. Se tema=DANINHAS, não virar praga/doença (apenas 1 linha de checagem).
- Se o usuário pedir “EXPLIQUE MAIS FÁCIL”, reescreva simples.

FORMATO OBRIGATÓRIO (SOMENTE JSON, sem markdown):
{
  "resumo": "1-2 frases técnicas e objetivas",
  "diagnostico_inicial": [
    "Hipótese A (por quê)",
    "Hipótese B (por quê)"
  ],
  "checagens_para_confirmar": [
    "O que observar/medir (como e onde)",
    "Análise/inspeção recomendada"
  ],
  "plano_de_acao": {
    "imediato_0_72h": ["..."],
    "curto_prazo_7_14d": ["..."],
    "prevencao": ["..."]
  },
  "riscos_e_cuidados": [
    "ex: seletividade, resíduos, bem-estar, intoxicação, manejo integrado"
  ],
  "perguntas_chave": ["...", "...", "..."],
  "fontes": [
    {"titulo":"...", "instituicao":"...", "link":"..."},
    {"titulo":"...", "instituicao":"...", "link":"..."}
  ]
}

CASO ESPECIAL:
- Se CANA + DANINHAS e aparecer "mucuna": controle localizado, cortar/roçar e tratar rebrota, não deixar sementear, reforçar competitividade da soqueira.
`;
}

function jsonToPrettyText(j: any) {
  const diag = Array.isArray(j.diagnostico_inicial) ? j.diagnostico_inicial.map((x: string) => `- ${x}`).join("\n") : "";
  const chk = Array.isArray(j.checagens_para_confirmar) ? j.checagens_para_confirmar.map((x: string) => `- ${x}`).join("\n") : "";

  const im = Array.isArray(j?.plano_de_acao?.imediato_0_72h) ? j.plano_de_acao.imediato_0_72h.map((x: string) => `- ${x}`).join("\n") : "";
  const cp = Array.isArray(j?.plano_de_acao?.curto_prazo_7_14d) ? j.plano_de_acao.curto_prazo_7_14d.map((x: string) => `- ${x}`).join("\n") : "";
  const prev = Array.isArray(j?.plano_de_acao?.prevencao) ? j.plano_de_acao.prevencao.map((x: string) => `- ${x}`).join("\n") : "";

  const riscos = Array.isArray(j.riscos_e_cuidados) ? j.riscos_e_cuidados.map((x: string) => `- ${x}`).join("\n") : "";
  const perg = Array.isArray(j.perguntas_chave) ? j.perguntas_chave.map((x: string, i: number) => `${i + 1}. ${x}`).join("\n") : "";

  const fontes = Array.isArray(j.fontes)
    ? j.fontes
        .map((f: any) => {
          const t = String(f?.titulo || "").trim();
          const inst = String(f?.instituicao || "").trim();
          const link = String(f?.link || "").trim();
          const base = [t, inst].filter(Boolean).join(" — ");
          return `- ${base}${link ? `\n  ${link}` : ""}`;
        })
        .join("\n")
    : "";

  return `📍 **Resumo técnico**: ${j.resumo ?? ""}

🧪 **Diagnóstico inicial (hipóteses)**:
${diag}

✅ **Checagens para confirmar**:
${chk}

⚡ **Plano de ação**
- **Imediato (0–72h)**:
${im}
- **Curto prazo (7–14d)**:
${cp}
- **Prevenção**:
${prev}

⚠️ **Riscos e cuidados**
${riscos}

❓ **Perguntas-chave**
${perg}

📚 **Fontes**
${fontes}
`;
=======
function formatRagContext(chunks: Array<{ title: string; content: string; similarity: number; category: string | null }>) {
  if (!chunks?.length) return "";
  return chunks
    .map((c, i) => `[#${i + 1}] ${c.title}${c.category ? ` (${c.category})` : ""}\n${c.content}`)
    .join("\n\n---\n\n");
}

function extractLocationHint(text: string) {
  // simples: pega trecho após "para" ou "em"
  const m = text.match(/\b(?:para|em)\s+([A-Za-zÀ-ÿ0-9\s\-\.]+?)(?:\s*-\s*[A-Z]{2})?\b/i);
  return m?.[1]?.trim() || "";
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
}

export async function POST(req: Request) {
  try {
<<<<<<< HEAD
    const body = await req.json();

    let messages: ChatMsg[] = [];
    if (Array.isArray(body.messages)) messages = body.messages;
    else if (typeof body.message === "string") messages = [{ role: "user", content: body.message }];

    if (!messages.length) {
      return Response.json({ reply: "Formato inválido. Envie {message} ou {messages}." }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user" && (m.content || "").trim().length > 0);
    const lastText = (lastUser?.content ?? "").trim();

    const cultureNow = detectCulture(lastText);
    const themeNow = detectTheme(lastText);

    const culture = cultureNow !== "GERAL" ? cultureNow : pickFromHistory(messages, detectCulture);
    const theme = themeNow !== "GERAL" ? themeNow : pickFromHistory(messages, detectTheme);

    console.log("CLASSIFICADO =>", { culture, theme, lastText });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ reply: "OPENAI_API_KEY não encontrado no .env.local" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const forcedUser: ChatMsg = {
      role: "user",
      content: `CONTEXTO FIXO: CULTURA=${culture} | TEMA=${theme}\n\nPergunta do usuário:\n${lastText}`,
    };

    const r1 = await client.responses.create({
      model: "gpt-4o-mini",
      input: [{ role: "system", content: systemPrompt(culture, theme) }, forcedUser],
    });

    const text1 = extractText(r1);

    let parsed: any = null;
    try {
      parsed = JSON.parse(text1);
    } catch {
      const r2 = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: systemPrompt(culture, theme) },
          {
            role: "user",
            content: `Seu último output NÃO foi JSON válido. Reescreva SOMENTE em JSON válido, seguindo o schema exato.\n\nPergunta:\n${lastText}`,
          },
        ],
      });
      parsed = JSON.parse(extractText(r2));
    }

    const pretty = jsonToPrettyText(parsed);
    return Response.json({ reply: pretty, data: parsed, meta: { culture, theme } });
  } catch (error) {
    console.error("ERRO OPENAI >>>", error);
    return Response.json({ reply: "Erro interno ao falar com a IA. Veja o terminal para detalhes." }, { status: 500 });
  }
}
=======
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return Response.json({ error: "UNAUTH" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const messages: ChatMsg[] = Array.isArray(body?.messages) ? body.messages : [];
    const threadIdFromBody: string | null = typeof body?.threadId === "string" ? body.threadId : null;
    const lastText = [...messages].reverse().find((m) => m?.role === "user")?.content || "";

    const plan = await getUserPlan(user.id, user.email);
    const consumed = await consumeQuestion(user.id, plan, 1);
    const usage = await getUsageStatus(user.id, user.email);

    if (!consumed.allowed) {
      return Response.json({ error: "LIMIT", usage }, { status: 402 });
    }

    const culture = detectCulture(lastText);
    const theme = detectTheme(lastText);

    // RAG (base do AgroMentor)
    const chunks = await retrieveContext(lastText, 6, null);
    const ragContext = formatRagContext(chunks);

    // Previsão do tempo (quando pedir)
    let forecastText = "";
    if (looksLikeWeatherQuestion(lastText)) {
      const loc = extractLocationHint(lastText) || lastText;
      const fc = await getForecast(loc);
      if (fc) {
        const lines = fc.daily
          .slice(0, 5)
          .map((d) => `- ${d.date}: mín ${d.temp_min_c ?? "?"}°C / máx ${d.temp_max_c ?? "?"}°C, chuva ${d.rain_mm ?? "?"} mm`)
          .join("\n");
        forecastText = `Previsão (7 dias) para ${fc.location}:\n${lines}`;
      } else {
        forecastText = "Não encontrei a cidade. Diga assim: 'previsão para Ribeirão Preto - SP'.";
      }
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return Response.json(
        {
          reply:
            "Estou sem OPENAI_API_KEY configurada no servidor. Configure no .env.local para ativar a IA (e o RAG).",
          usage,
        },
        { status: 200 }
      );
    }

    const openai = new OpenAI({ apiKey: key });

    const system = `
Você é o AgroMentor IA, especialista em AGRICULTURA DO BRASIL e AGRICULTURA DE PRECISÃO, incluindo pecuária.
Responda com alta confiança, mas sem inventar. Se faltar dado, peça 2-4 perguntas objetivas.

Formato de resposta:
1) Diagnóstico provável (ou hipóteses)
2) Como confirmar no campo (checklist)
3) Manejo recomendado (ações imediatas + manejo)
4) Equipamentos recomendados (coerentes): bomba costal, trator com barra, uniporte/autopropelido, drone ou avião (quando for defensivos)
5) Economia (quando fizer sentido): custo/benefício e risco de não agir
6) Avisos de segurança e responsabilidade técnica quando aplicável

Contexto detectado: cultura=${culture}, tema=${theme}

Use o CONHECIMENTO INTERNO (RAG) quando houver. Se o RAG não trouxer nada, use conhecimento agronômico geral.
`.trim();

    const extraContext = [
      ragContext ? `CONHECIMENTO INTERNO (RAG):\n${ragContext}` : "",
      forecastText ? `DADOS DE CLIMA:\n${forecastText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const inputMessages: ChatMsg[] = [
      { role: "system", content: system + (extraContext ? `\n\n${extraContext}` : "") },
      ...messages.slice(-20),
    ];

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: inputMessages,
    });

    const reply = extractText(r) || "Não consegui gerar uma resposta.";

    // -----------------------
    // Salvar conversa no banco (thread + mensagens) e criar Caso automaticamente
    // -----------------------
    let threadId = threadIdFromBody;
    let caseId: string | null = null;

    const firstUserMsg = messages.find((m) => m.role === "user")?.content || "";
    const lastUserMsg = lastText;

    if (!threadId) {
      const title = (firstUserMsg || "Novo atendimento").slice(0, 80);

      // Cria caso (backoffice)
      const { data: createdCase, error: caseErr } = await supabase
        .from("cases")
        .insert({
          user_id: user.id,
          title,
          culture: culture || null,
          municipality: null,
          status: "open",
        })
        .select("id")
        .single();

      if (!caseErr && createdCase?.id) caseId = createdCase.id;

      // Cria thread
      const { data: createdThread, error: threadErr } = await supabase
        .from("chat_threads")
        .insert({ user_id: user.id, case_id: caseId, title })
        .select("id,case_id")
        .single();

      if (!threadErr && createdThread?.id) {
        threadId = createdThread.id;
        caseId = createdThread.case_id ?? caseId;

        // Salva histórico inicial (normalmente 1 msg)
        if (messages.length) {
          await supabase.from("chat_messages").insert(
            messages.map((m) => ({
              thread_id: threadId,
              role: m.role,
              content: m.content,
            }))
          );
        }
      }
    } else {
      const { data: t } = await supabase.from("chat_threads").select("case_id").eq("id", threadId).single();
      caseId = t?.case_id ?? null;

      // Salva só a última msg do user (pra não duplicar tudo)
      if (lastUserMsg) {
        await supabase.from("chat_messages").insert({ thread_id: threadId, role: "user", content: lastUserMsg });
      }
    }

    // Salva resposta
    if (threadId) {
      await supabase.from("chat_messages").insert({ thread_id: threadId, role: "assistant", content: reply });
      await supabase.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    }

    return Response.json({ reply, meta: { culture, theme }, usage, threadId, caseId });
  } catch (error) {
    console.error("ERRO CHAT >>>", error);
    return Response.json({ reply: "Erro interno ao falar com a IA. Veja o terminal para detalhes." }, { status: 500 });
  }
}
>>>>>>> 9363d12 (Deploy inicial AgroMentor IA)
