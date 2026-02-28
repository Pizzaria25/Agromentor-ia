import OpenAI from "openai";

console.log("ROUTE NOVO CARREGADO ✅ v4");

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

/** ✅ LÊ o texto retornado pelo Responses API (SDK novo) */
function extractText(response: any): string {
  try {
    const out = response?.output ?? [];
    let text = "";

    for (const item of out) {
      const contents = item?.content ?? [];
      for (const c of contents) {
        if (c?.type === "output_text" && typeof c?.text === "string") {
          text += c.text;
        }
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
  return "GERAL";
}

function detectTheme(text: string) {
  const t = (text || "").toLowerCase();

  if (
    /\bdaninha\b|\bmato\b|\binvasora\b|\bmamona\b|\bmucuna\b|\bbuva\b|\bcapim-amargoso\b|\btrapoeraba\b|\bcorda-de-viola\b|\bp[eé]-de-galinha\b|\bpic[aã]o-preto\b|\bcaruru\b|\bguanxuma\b/.test(
      t
    )
  )
    return "DANINHAS";

  if (/\bpraga\b|\bbroca\b|\bcigarrinha\b|\bpulg[aã]o\b|\bmosca\b|\blagarta\b|\bpercevejo\b/.test(t))
    return "PRAGAS";

  if (/\bdoen[cç]a\b|\bmancha\b|\bferrugem\b|\bm[oó]dio\b|\bcarv[aã]o\b|\bpodrid[aã]o\b/.test(t))
    return "DOENCAS";

  if (/\baduba[cç][aã]o\b|\bnutriente\b|\bdefici[eê]ncia\b|\bamarel(a|ado)\b|\bclorose\b|\bcalc[aá]rio\b/.test(t))
    return "NUTRICAO";

  if (/\bseca\b|\bestresse h[ií]drico\b|\bencharc\b|\bexcesso de [aá]gua\b|\birriga[cç][aã]o\b|\bchuva\b/.test(t))
    return "AGUA_CLIMA";

  return "GERAL";
}

/** ✅ Cultura pelo histórico (quando o user responde só "bem infestado" etc.) */
function pickCultureFromHistory(messages: ChatMsg[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const c = detectCulture(m.content || "");
    if (c !== "GERAL") return c;
  }
  return "GERAL";
}

function pickThemeFromHistory(messages: ChatMsg[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const th = detectTheme(m.content || "");
    if (th !== "GERAL") return th;
  }
  return "GERAL";
}

/** 🔒 Prompt rígido + saída em JSON */
function systemPrompt(culture: string, theme: string) {
  return `
Você é o AgroMentor IA (engenheiro agrônomo de campo, Brasil).
Responda como CONSULTOR DE CAMPO: direto, prático e aplicável.

TRAVAS (OBRIGATÓRIO):
- Cultura FIXA = ${culture}. PROIBIDO perguntar "qual cultura" e PROIBIDO trocar a cultura.
- Tema FIXO = ${theme}. Se tema=DANINHAS, NÃO desviar para praga/doença/nutrição, no máximo 1 linha de checagem e volta.
- PROIBIDO ser genérico. Mesmo faltando dado, entregue ação inicial + 3 perguntas boas.

FORMATO (OBRIGATÓRIO):
Devolva SOMENTE um JSON válido (sem markdown) exatamente assim:
{
  "resumo": "...",
  "hipoteses": ["...", "..."],
  "plano": {
    "agora": ["...", "..."],
    "semanas_2_4": ["...", "..."],
    "prevencao": ["...", "..."]
  },
  "perguntas": ["...", "...", "..."]
}

GUIAS IMPORTANTES:
- Sempre incluir manejo por cenário (pequena x grande; reboleira x área toda).
- Nunca dar dose numérica. Pode dizer "seguir bula/receituário e seletividade".
- Priorize soluções baratas antes das caras.
- Evite frases tipo "consulte um especialista". Você é o especialista.

CASO ESPECIAL:
- Se cultura=CANA e tema=DANINHAS e aparecer "mucuna":
  • Mucuna é trepadeira: sombreamento/embuchamento; objetivo = não deixar subir e não deixar sementear.
  • Controle LOCALIZADO (spot) nas reboleiras + roçada/arranquio onde estiver enramada.
  • Se pequena: controle químico seletivo registrado para cana (folha larga/trepadeiras) + monitorar rebrote.
  • Se grande/enramada: mecânico agora (roçar/cortar) e químico na rebrota.
  • Prevenção: fechar falhas da soqueira, revisar compactação/carreiro, aumentar competitividade/cobertura, monitorar divisa/rodado.
`;
}

function jsonToPrettyText(j: any) {
  const hip = Array.isArray(j.hipoteses) ? j.hipoteses.map((x: string) => `- ${x}`).join("\n") : "";
  const agora = Array.isArray(j?.plano?.agora) ? j.plano.agora.map((x: string) => `- ${x}`).join("\n") : "";
  const sem = Array.isArray(j?.plano?.semanas_2_4) ? j.plano.semanas_2_4.map((x: string) => `- ${x}`).join("\n") : "";
  const prev = Array.isArray(j?.plano?.prevencao) ? j.plano.prevencao.map((x: string) => `- ${x}`).join("\n") : "";
  const perg = Array.isArray(j.perguntas) ? j.perguntas.map((x: string, i: number) => `${i + 1}. ${x}`).join("\n") : "";

  return `1) **Resumo do que entendi**: ${j.resumo ?? ""}

2) **Hipóteses prováveis**:
${hip}

3) **Plano de ação**:
- **Agora (hoje/semana)**:
${agora}
- **Próximas 2–4 semanas**:
${sem}
- **Prevenção (próxima estação/safra)**:
${prev}

4) **3 perguntas-chave**:
${perg}
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

    // ✅ se o user responder "bem infestado..." mantém cultura/tema pelo histórico
    const cultureNow = detectCulture(lastText);
    const themeNow = detectTheme(lastText);
    const culture = cultureNow !== "GERAL" ? cultureNow : pickCultureFromHistory(messages);
    const theme = themeNow !== "GERAL" ? themeNow : pickThemeFromHistory(messages);

    console.log("CLASSIFICADO =>", { culture, theme, lastText });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ reply: "OPENAI_API_KEY não encontrado no .env.local" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    const forcedUser: ChatMsg = {
      role: "user",
      content: `CULTURA=${culture} | TEMA=${theme}\nPergunta do usuário: ${lastText}`,
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
            content: `Seu último output NÃO foi JSON válido. Reescreva SOMENTE em JSON válido, seguindo o schema exato.\n\nPergunta: ${lastText}`,
          },
        ],
      });

      const text2 = extractText(r2);
      parsed = JSON.parse(text2);
    }

    const pretty = jsonToPrettyText(parsed);
    return Response.json({ reply: pretty, data: parsed, meta: { culture, theme } });
  } catch (error) {
    console.error("ERRO OPENAI >>>", error);
    return Response.json({ reply: "Erro interno ao falar com a IA. Veja o terminal para detalhes." }, { status: 500 });
  }
}