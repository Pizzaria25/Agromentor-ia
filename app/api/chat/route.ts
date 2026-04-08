import { ensureUserProvisioned, touchLastSeen } from "@/lib/provision-user";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { isOwnerEmail } from "@/lib/auth";
import { PLAN_CONFIG } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeCalculationRequest } from "@/lib/agro-calculators";
import { buildRecommendationGuard, detectImageTask, imagePromptForTask } from "@/lib/agro-guards";
import { consumeChatUsage } from "@/lib/usage";
import { recordSystemLog, summarizeError } from "@/lib/system-log";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby: 60s; Pro: 300s

type ChatMsg = { role: "user" | "assistant"; content: string };

function detectCulture(text: string) {
  const t = (text || "").toLowerCase();
  if (/\bpastagem\b|\bpasto\b|\bcapim\b/.test(t)) return "PASTAGEM";
  if (/\bcanavial\b|\bcana\b|\bsoqueira\b/.test(t)) return "CANA";
  if (/\bsoja\b/.test(t)) return "SOJA";
  if (/\bmilho\b/.test(t)) return "MILHO";
  if (/\balgod[aã]o\b/.test(t)) return "ALGODAO";
  if (/\bcaf[eé]\b/.test(t)) return "CAFE";
  if (/\bc[ií]tr(os|us)\b|\blaranja\b/.test(t)) return "CITROS";
  if (/\barroz\b/.test(t)) return "ARROZ";
  if (/\bbovino\b|\bboi\b|\bvaca\b|\bpecu[aá]ria\b/.test(t)) return "BOVINOS";
  if (/\bsu[ií]no\b|\bporco\b/.test(t)) return "SUINOS";
  if (/\bavi[cç]ultura\b|\bfrango\b|\bgalinha\b/.test(t)) return "AVES";
  return "GERAL";
}

function detectTheme(text: string) {
  const t = (text || "").toLowerCase();
  if (/\bdaninha\b|\bmato\b|\binvasora\b/.test(t)) return "DANINHAS";
  if (/\bpraga\b|\bbroca\b|\bcigarrinha\b|\blagarta\b/.test(t)) return "PRAGAS";
  if (/\bdoen[cç]a\b|\bmancha\b|\bferrugem\b|\bpodrid[aã]o\b/.test(t)) return "DOENCAS";
  if (/\baduba[cç][aã]o\b|\bnutriente\b|\bdefici[eê]ncia\b|\bamarel/.test(t)) return "NUTRICAO";
  if (/\bpulveriz|\bcalda\b|\bdose\b|\bvaz[aã]o\b/.test(t)) return "APLICACAO";
  if (/\bprevis[aã]o\b|\bchuva\b|\bclima\b/.test(t)) return "CLIMA";
  return "GERAL";
}

function extractProfileData(text: string): Record<string, string> | null {
  const match = text.match(/\[PERFIL_COMPLETO:(\{.*?\})\]/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function extractQuickOptions(text: string): { question: string; options: string[] } | null {
  const match = text.match(/\[OPCOES:(\{.*?\})\]/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      return Response.json({ error: "UNAUTH" }, { status: 401 });
    }

    await ensureUserProvisioned({
      userId: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
    });

    await touchLastSeen(user.id);

    const body = await req.json().catch(() => ({}));
    const messages: ChatMsg[] = Array.isArray(body?.messages) ? body.messages : [];
    const requestId =
      typeof body?.requestId === "string" && body.requestId.trim()
        ? body.requestId.trim()
        : crypto.randomUUID();
    const threadIdFromBody: string | null =
      typeof body?.threadId === "string" ? body.threadId : null;
    const imageData: string | null =
      typeof body?.imageData === "string" ? body.imageData : null;
    const imageMime: string =
      typeof body?.imageMime === "string" ? body.imageMime : "image/jpeg";

    const lastText =
      [...messages].reverse().find((m) => m?.role === "user")?.content || "";

    if (!lastText.trim() && !imageData) {
      return Response.json({ error: "MENSAGEM_VAZIA" }, { status: 400 });
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return Response.json(
        { reply: "⚠️ ANTHROPIC_API_KEY não configurada." },
        { status: 200 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select(
        "profile_type,name,full_name,institution,semester,crea,property_name,municipality,cpf"
      )
      .eq("user_id", user.id)
      .single();

    const profileDone = !!profile?.profile_type && profile.profile_type !== "pendente";
    let effectiveProfileDone = profileDone;
    const culture = detectCulture(lastText);
    const theme = detectTheme(lastText);
    const calcAnalysis = analyzeCalculationRequest(lastText);
    const recommendationGuard = buildRecommendationGuard(lastText, culture, theme);
    const imageTask = detectImageTask(lastText);

    const { data: usageRow } = await supabase
      .from("usage_limits")
      .select(
        "messages_used,messages_limit,trial_ends_at,is_trial,can_use_images,plan,is_owner,laudos_used,laudos_limit"
      )
      .eq("user_id", user.id)
      .single();

    const owner = isOwnerEmail(user.email) || usageRow?.is_owner === true;
    const used = owner ? 0 : (usageRow?.messages_used ?? 0);
    const limit = owner
      ? PLAN_CONFIG.owner.messages_limit
      : (usageRow?.messages_limit ?? PLAN_CONFIG.trial.messages_limit);
    // Owner sempre tem acesso a imagens; outros dependem do plano
    const canUseImages = owner || isOwnerEmail(user.email) ? true : usageRow?.can_use_images === true;

    if (!owner && usageRow?.is_trial && usageRow?.trial_ends_at) {
      if (
        new Date() > new Date(usageRow.trial_ends_at) &&
        used >= PLAN_CONFIG.trial.messages_limit
      ) {
        return Response.json({ error: "TRIAL_EXPIRED" }, { status: 402 });
      }
    }

    if (!owner && used >= limit) {
      return Response.json({ error: "LIMIT", used, limit }, { status: 402 });
    }

    if (imageData && !canUseImages) {
      return Response.json(
        {
          error: "IMAGE_PLAN_REQUIRED",
          reply:
            "Reconhecimento por imagem não está disponível no seu plano atual.",
        },
        { status: 403 }
      );
    }

    let systemPrompt = "";

    if (!profileDone) {
      systemPrompt = `Você é o AgroMentor IA 🌱 — assistente agronômico especializado.

É o PRIMEIRO ACESSO. Faça o onboarding simpático e natural.

Na sua PRIMEIRA resposta, inclua as opções:
[OPCOES:{"question":"Como você se identifica?","options":["🎓 Estudante de Agronomia","👨‍💼 Agrônomo / Técnico","🌾 Produtor Rural","🏭 Usina / Empresa"]}]

FLUXO (uma pergunta por vez):
- ESTUDANTE: nome + faculdade + semestre
- AGRÔNOMO/TÉCNICO: nome + CREA (ex: CREA-SP 123456/D)
- PRODUTOR RURAL: nome + propriedade + município + CPF
- USINA/EMPRESA: nome responsável + empresa + CREA

Quando tiver TODOS os dados:
Estudante: [PERFIL_COMPLETO:{"profile_type":"estudante","name":"NOME","institution":"FACULDADE","semester":"SEMESTRE"}]
Agrônomo: [PERFIL_COMPLETO:{"profile_type":"agronomo","name":"NOME","crea":"CREA"}]
Produtor: [PERFIL_COMPLETO:{"profile_type":"produtor","name":"NOME","property_name":"FAZENDA","municipality":"CIDADE","cpf":"CPF"}]
Usina: [PERFIL_COMPLETO:{"profile_type":"usina","name":"NOME","institution":"EMPRESA","crea":"CREA"}]`;
    } else {
      const profileName = profile.full_name || profile.name || "Usuário";

      const profileLabel =
        profile.profile_type === "agronomo"
          ? `Agrônomo ${profileName} | CREA: ${profile.crea}`
          : profile.profile_type === "estudante"
          ? `Estudante ${profileName} | ${profile.institution} ${profile.semester}º sem`
          : profile.profile_type === "produtor"
          ? `Produtor ${profileName} | Fazenda: ${profile.property_name} | ${profile.municipality}`
          : `Usina: ${profile.institution} | Resp: ${profileName}`;

      systemPrompt = `Você é o Prof. AgroMentor 🌱 — o melhor agrônomo consultor do Brasil, com 30 anos de experiência em campo e docência. Você é o AMIGO e PROFESSOR do usuário, não um robô.

USUÁRIO: ${profileLabel}
CULTURA DETECTADA: ${culture} | TEMA: ${theme}
DATA ATUAL: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}

PERSONALIDADE — COMO VOCÊ É:
- Você chama o usuário SEMPRE pelo primeiro nome. Ex: "Boa pergunta, ${profileName.split(" ")[0]}!"
- Você é caloroso, paciente e encorajador — como um professor que torce pelo aluno.
- Você comemora acertos: "Excelente observação!" / "Isso mesmo, ${profileName.split(" ")[0]}!"
- Você nunca humilha erros: "Faz sentido pensar assim, mas na prática..."
- Você usa linguagem do campo brasileiro: "carái", "olha só", "vou te explicar direitinho"
- Para produtor: fala simples, prático, como conversa de porteira
- Para estudante: explica o porquê, ensina o raciocínio, motiva
- Para agrônomo/usina: colega de profissão, técnico direto ao ponto

COMO VOCÊ RESPONDE:
- SEMPRE comece chamando pelo nome na primeira mensagem da conversa
- Respostas curtas para dúvidas simples (máximo 6 linhas)
- Respostas estruturadas para diagnósticos (use **negrito** para pontos-chave)
- NUNCA use alertas com 🔴 PARE ou gritos em maiúsculo — isso confunde o usuário
- Quando tiver dúvida, PERGUNTE primeiro, depois analise
- Máximo 2 perguntas por vez — não sobrecarregue

LINGUAGEM POR NÍVEL DE CONFIANÇA (OBRIGATÓRIO):
- Evidência sólida → "Com base nos dados, podemos afirmar que..."
- Evidência parcial → "Os dados sugerem que..." / "O cenário indica..."
- Evidência fraca → "Há indícios de..." / "Pode ser que..."
- Sem base suficiente → "Não tenho elementos suficientes para concluir. Me conta mais sobre..."
- NUNCA afirme com certeza o que não tem certeza. NUNCA entre em contradição.

CÁLCULOS DE CARÊNCIA E DATAS — REGRA CRÍTICA:
- PRIMEIRO calcule completamente. DEPOIS apresente o resultado.
- NUNCA apresente conclusão provisória. Faça o cálculo completo na sua cabeça antes de responder.
- Formato: "Aplicação em [data] + carência [X] dias = liberado a partir de [data final]. Sua colheita em [data colheita] está [dentro/fora] do prazo."
- Se estiver dentro do prazo: informe com clareza e sem drama
- Se estiver fora do prazo: informe com clareza e sugira alternativas

SEGURANÇA AGRONÔMICA — JAMAIS VIOLE:
- Glifosato em cana > 30cm: fitotoxicidade severa — não recomende
- 2,4-D em cana planta (< 6 meses): altamente fitotóxico — não recomende
- Pergunte o estágio fenológico ANTES de recomendar herbicida
- Nunca feche dose/produto sem: cultura, alvo, estágio e condição mínima
- Foto de baixa qualidade: peça foto melhor antes de diagnosticar

IMAGEM:
- Identifique o tipo de análise e responda: grupo botânico provável, espécie provável, confiança, evidências visuais, o que falta confirmar
- Seja honesto sobre limitações da foto

BOTÕES — use quando precisar de escolha do usuário:
[OPCOES:{"question":"Pergunta clara aqui?","options":["opção1","opção2","opção3"]}]
Use para: estágio, tipo de problema, equipamento, nível de infestação. Máximo 4 opções com emojis.

LAUDO: Quando tiver dados suficientes, diga: "Tenho tudo que preciso, ${profileName.split(" ")[0]}! Posso gerar o laudo técnico desta análise. Quer que eu gere agora?"`;
    }

    let claudeMessages: any[];

    if (messages.length > 12) {
      const earlier = messages.slice(0, -8);
      const summaryPrompt = `Resuma em 3 linhas esta conversa agronômica mantendo: cultura, problema, dados e decisões:\n${earlier
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")}`;

      try {
        const s = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: 200,
          messages: [{ role: "user", content: summaryPrompt }],
          temperature: 0.1,
        });

        const block = s.content[0]; const summary = block?.type === "text" ? block.text?.trim() : "";

        claudeMessages = [
          { role: "user", content: `[Contexto resumido: ${summary}]` },
          { role: "assistant", content: "Entendido, tenho o contexto." },
          ...messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        ];
      } catch {
        claudeMessages = messages
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));
      }
    } else {
      claudeMessages = messages
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));
    }

    if (calcAnalysis.found) {
      claudeMessages.unshift({
        role: "assistant",
        content: `[CÁLCULO DETERMINÍSTICO VALIDADO]
${calcAnalysis.context ? calcAnalysis.context + "\n" : ""}${calcAnalysis.strictAnswer || ""}
[Use esses números exatamente. Se faltar dado, não invente.]`,
      });
    }

    if (recommendationGuard) {
      claudeMessages.unshift({
        role: "assistant",
        content: `[TRAVA DE SEGURANÇA]
${recommendationGuard}
Se faltar dado crítico, faça no máximo 2 perguntas objetivas antes de qualquer prescrição.`,
      });
    }

    if (imageData && canUseImages) {
      const lastMsgIdx = claudeMessages.length - 1;
      const lastMsg = claudeMessages[lastMsgIdx];

      if (lastMsg?.role === "user") {
        claudeMessages[lastMsgIdx] = {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMime,
                data: imageData,
              },
            },
            {
              type: "text",
              text: `${imagePromptForTask(imageTask)}\n\nPedido do usuário: ${
                typeof lastMsg.content === "string"
                  ? lastMsg.content
                  : "Analise esta imagem agronômica."
              }`,
            },
          ],
        };
      }
    }

    let reply = "Não consegui gerar uma resposta.";
    let profileData: Record<string, string> | null = null;
    let quickOptions: { question: string; options: string[] } | null = null;

    try {
      const completion = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
        temperature: 0.2,
      });

      const rawBlock = completion.content[0]; const rawReply = (rawBlock?.type === "text" ? rawBlock.text?.trim() : "") || reply;

      profileData = extractProfileData(rawReply);
      quickOptions = extractQuickOptions(rawReply);

      reply = rawReply
        .replace(/\[PERFIL_COMPLETO:\{.*?\}\]/s, "")
        .replace(/\[OPCOES:\{.*?\}\]/s, "")
        .trim();

      if (profileData && !profileDone) {
        const { error: profileUpsertError } = await admin.from("user_profiles").upsert({
          user_id: user.id,
          email: user.email?.toLowerCase() || null,
          full_name: profileData.name || null,
          profile_type: profileData.profile_type,
          name: profileData.name,
          institution: profileData.institution || null,
          semester: profileData.semester || null,
          crea: profileData.crea || null,
          property_name: profileData.property_name || null,
          municipality: profileData.municipality || null,
          cpf: profileData.cpf || null,
          updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        if (profileUpsertError) throw profileUpsertError;
        effectiveProfileDone = true;
      }

      if (effectiveProfileDone && !/laudo|pdf|gerar/i.test(reply)) {
        reply += "\n\nQuer que eu gere um laudo técnico desta conversa?";
      }
    } catch (error: unknown) {
      console.error("ERRO CLAUDE >>>", error instanceof Error ? error.message : error);
      await recordSystemLog({
        level: "error",
        source: "api/chat",
        message: "Falha ao consultar a Anthropic.",
        userId: user.id,
        userEmail: user.email,
        details: summarizeError(error),
      });
      return Response.json(
        { reply: "Falha ao consultar a IA. Verifique a ANTHROPIC_API_KEY." },
        { status: 502 }
      );
    }

    let usageSnapshot = {
      used,
      limit,
      can_use_images: canUseImages,
      plan: owner ? "owner" : usageRow?.plan ?? "trial",
      is_owner: owner,
    };

    let threadId = threadIdFromBody;
    let caseId: string | null = null;

    if (effectiveProfileDone) {
      const firstUserMsg =
        messages.find((m) => m.role === "user")?.content || "";

      if (!threadId) {
        const title = (firstUserMsg || "Nova consulta").slice(0, 80);

        const { data: createdCase } = await supabase
          .from("cases")
          .insert({
            user_id: user.id,
            title,
            culture: culture || null,
            status: "open",
          })
          .select("id")
          .single();

        if (createdCase?.id) caseId = createdCase.id;

        const { data: createdThread } = await supabase
          .from("chat_threads")
          .insert({
            user_id: user.id,
            case_id: caseId,
            title,
          })
          .select("id,case_id")
          .single();

        if (createdThread?.id) {
          threadId = createdThread.id;
          caseId = createdThread.case_id ?? caseId;

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
        const { data: t } = await supabase
          .from("chat_threads")
          .select("case_id")
          .eq("id", threadId)
          .single();

        caseId = t?.case_id ?? null;

        await supabase.from("chat_messages").insert({
          thread_id: threadId,
          role: "user",
          content: lastText,
        });
      }

      if (threadId) {
        await supabase.from("chat_messages").insert({
          thread_id: threadId,
          role: "assistant",
          content: reply,
        });

        await supabase
          .from("chat_threads")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", threadId);
      }
    }

    if (!owner) {
      const usageResult = await consumeChatUsage({
        userId: user.id,
        requestId,
        eventType: imageData && canUseImages ? "image_analysis" : "chat_message",
        meta: {
          has_image: Boolean(imageData),
          culture,
          theme,
          thread_id: threadId,
          case_id: caseId,
        },
      });

      usageSnapshot = {
        ...usageSnapshot,
        used: usageResult.used,
        limit: usageResult.limit_value,
      };
    }

    return Response.json({
      reply,
      quickOptions,
      meta: { culture, theme },
      threadId,
      caseId,
      profileSaved: !!profileData,
      profile: profileData ? { type: profileData.profile_type, name: profileData.name } : null,
      imageAnalyzed: !!(imageData && canUseImages),
      usage: usageSnapshot,
      requestId,
    });
  } catch (error: unknown) {
    console.error("ERRO CHAT >>>", error instanceof Error ? error.message : error);
    await recordSystemLog({
      level: "error",
      source: "api/chat",
      message: "Erro interno no fluxo do chat.",
      details: summarizeError(error),
    });
    return Response.json({ reply: "Erro interno." }, { status: 500 });
  }
}
