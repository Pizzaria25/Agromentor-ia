import OpenAI from "openai";

console.log("ROUTE NOVO CARREGADO ✅ v5-tech-sources");

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

/** LÊ o texto retornado pelo Responses API (SDK novo) */
function extractText(response: any): string {
  try {
    const out = response?.output ?? [];
    let text = "";
    for (const item of out) {
      const contents = item?.content ?? [];
      for (const c of contents) {
        if (c?.type === "output_text" && typeof c?.text === "string") text += c.text;
      }
    }
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
  if (/\bhort[aã]\b|\bhortali[cç]a\b|\bverdura\b|\blegume\b/.test(t)) return "HORTI";
  if (/\bapicultur|\bcolmeia|\babelha/.test(t)) return "APICULTURA";
  if (/\bgado\b|\bbovino|\bporco|\bsu[ií]no|\bgalinha|\bfrango|\bovino|\bcaprino|\bcavalo|\bequino/.test(t))
    return "ANIMAIS";
  return "GERAL";
}

function detectTheme(text: string) {
  const t = (text || "").toLowerCase();

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

  return "GERAL";
}

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
}

export async function POST(req: Request) {
  try {
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