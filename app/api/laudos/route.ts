import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { isOwnerEmail } from "@/lib/auth";
import { PLAN_CONFIG } from "@/lib/plans";
import { z } from "zod";
import crypto from "node:crypto";
import { consumeLaudoUsage } from "@/lib/usage";
import { recordSystemLog, summarizeError } from "@/lib/system-log";

const Schema = z
  .object({
    thread_id: z.string().uuid().optional(),
    case_id: z.string().uuid().optional(),
    requestId: z.string().optional(),
    confirmed_data: z
      .object({
        culture: z.string().optional(),
        municipality: z.string().optional(),
        area_ha: z.number().optional(),
        stage: z.string().optional(),
        affected_pct: z.string().optional(),
        last_application: z.string().optional(),
        observations: z.string().optional(),
      })
      .optional(),
  })
  .refine((v) => !!v.case_id || !!v.thread_id, { message: "Informe case_id ou thread_id" });

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestId = typeof body?.requestId === "string" && body.requestId.trim() ? body.requestId.trim() : crypto.randomUUID();
    const parsed = Schema.safeParse({ ...body, requestId });
    if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

    const { thread_id, case_id: bodyCaseId, confirmed_data } = parsed.data;

    const { data: usageRow } = await supabase.from("usage_limits").select("laudos_used,laudos_limit,is_owner").eq("user_id", userData.user.id).single();
    const owner = isOwnerEmail(userData.user.email) || usageRow?.is_owner === true;
    const laudosUsed = owner ? 0 : usageRow?.laudos_used ?? 0;
    const laudosLimit = owner ? PLAN_CONFIG.owner.laudos_limit : usageRow?.laudos_limit ?? PLAN_CONFIG.trial.laudos_limit;
    if (!owner && laudosUsed >= laudosLimit) {
      return NextResponse.json({ error: "LAUDO_LIMIT", message: `Limite de laudos atingido (${laudosLimit}/mês). Faça upgrade do plano.` }, { status: 402 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("profile_type,name,institution,semester,crea,property_name,municipality,cpf,has_signature,signature_url")
      .eq("user_id", userData.user.id)
      .single();

    let case_id = bodyCaseId;
    let chatTranscript = "";

    if (thread_id) {
      const { data: thread } = await supabase.from("chat_threads").select("id,case_id,title").eq("id", thread_id).eq("user_id", userData.user.id).single();
      if (!thread) return NextResponse.json({ error: "Thread não encontrado." }, { status: 404 });
      case_id = thread.case_id ?? case_id;

      const { data: msgs } = await supabase.from("chat_messages").select("role,content,created_at").eq("thread_id", thread_id).order("created_at", { ascending: true }).limit(30);
      if (msgs?.length) {
        chatTranscript = msgs.map((m: any) => `${m.role === "user" ? "TÉCNICO" : "AGROMENTOR"}: ${m.content}`).join("\n\n");
      }
    }

    if (!case_id) return NextResponse.json({ error: "Caso não encontrado." }, { status: 400 });
    const { data: c } = await supabase.from("cases").select("*").eq("id", case_id).eq("user_id", userData.user.id).single();
    if (!c) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

    const profileFooter =
      profile?.profile_type === "agronomo"
        ? `Responsável Técnico: ${profile.name} | CREA: ${profile.crea}`
        : profile?.profile_type === "estudante"
        ? `Elaborado por: ${profile.name} (Estudante) | ${profile.institution} - ${profile.semester}º semestre | Documento de estudo, sem validade técnica oficial`
        : profile?.profile_type === "produtor"
        ? `Elaborado por: ${profile.name} (Produtor Rural) | CPF: ${profile.cpf} | Propriedade: ${profile.property_name} | ${profile.municipality}`
        : `Responsável: ${profile?.name} | Empresa: ${profile?.institution} | CREA: ${profile?.crea}`;

    const anthropic = getAnthropic();
    let content: any = null;

    if (anthropic) {
      const confirmedFields = confirmed_data ? `\nDADOS CONFIRMADOS PELO USUÁRIO:\n${JSON.stringify(confirmed_data, null, 2)}` : "";
      const prompt = `Você é um engenheiro agrônomo sênior gerando um LAUDO TÉCNICO formal.
Responda APENAS em JSON válido (sem markdown, sem explicações fora do JSON).

IMPORTANTE: Use APENAS os dados fornecidos abaixo. NÃO invente informações não mencionadas.
Se um dado não foi fornecido, use null no campo correspondente.

Campos obrigatórios:
{
  "title": "string — título descritivo do laudo",
  "document_type": "LAUDO_TECNICO" | "RELATORIO_CAMPO" | "LAUDO_ESTUDO",
  "context": {
    "culture": "string ou null",
    "municipality": "string ou null",
    "area_ha": "number ou null",
    "stage": "string ou null",
    "affected_pct": "string ou null",
    "last_application": "string ou null"
  },
  "summary": "string — resumo técnico em até 6 linhas",
  "observations": ["string array — observações do campo"],
  "hypotheses": [{"name": "string", "why": "string", "how_to_confirm": "string"}],
  "recommendation": {
    "immediate_actions": ["string array"],
    "management": ["string array"],
    "products": ["string array — apenas se houver indicação clara"]
  },
  "equipment_recommendation": {"items": [{"equipment": "string", "why": "string"}], "notes": "string"},
  "risk_level": "BAIXO" | "MEDIO" | "ALTO",
  "checklist_field": ["string array"],
  "disclaimer": "string"
}

DADOS DO CASO:
Título: ${c.title}
Cultura: ${c.culture ?? "não informada"}
Município: ${c.municipality ?? "não informado"}
Área (ha): ${c.area_ha ?? "não informada"}
${confirmedFields}

HISTÓRICO DO CHAT:
${chatTranscript || "(sem histórico)"}

PERFIL DO RESPONSÁVEL: ${profile?.profile_type ?? "não definido"}
Tipo de documento: ${profile?.profile_type === "estudante" ? "LAUDO_ESTUDO (sem validade técnica oficial)" : profile?.profile_type === "produtor" ? "RELATORIO_CAMPO" : "LAUDO_TECNICO"}`;

      try {
        const resp = await anthropic.messages.create({ model: CLAUDE_MODEL, max_tokens: 2048, messages: [{ role: "user", content: prompt }], temperature: 0.1 });
        const respBlock = resp.content[0]; content = safeJsonParse(respBlock?.type === "text" ? respBlock.text ?? "" : "");
        if (!content) throw new Error("Anthropic retornou resposta vazia ou JSON inválido.");
      } catch (e) {
        await recordSystemLog({ level: "error", source: "api/laudos", message: "Falha ao consultar a Anthropic para laudo.", userId: userData.user.id, userEmail: userData.user.email, details: summarizeError(e) });
        // Relançar erro para não gerar laudo fallback silenciosamente
        throw e;
      }
    }

    if (!content) {
      content = {
        title: `Laudo — ${c.title}`,
        document_type: profile?.profile_type === "estudante" ? "LAUDO_ESTUDO" : profile?.profile_type === "produtor" ? "RELATORIO_CAMPO" : "LAUDO_TECNICO",
        context: { culture: c.culture ?? null, municipality: c.municipality ?? null, area_ha: c.area_ha ?? null, stage: null, affected_pct: null, last_application: null },
        summary: "Laudo em modo fallback. Configure ANTHROPIC_API_KEY para geração automática completa.",
        observations: ["Adicione observações de campo para um laudo mais preciso."],
        hypotheses: [{ name: "Hipótese 1", why: "Dados insuficientes", how_to_confirm: "Coletar mais informações em campo" }, { name: "Hipótese 2", why: "Dados insuficientes", how_to_confirm: "Amostragem e análise laboratorial" }],
        recommendation: { immediate_actions: ["Coletar mais dados em campo"], management: ["Aguardar diagnóstico completo"], products: [] },
        equipment_recommendation: { items: [{ equipment: "Equipamento de amostragem", why: "Coleta de dados diagnósticos" }], notes: "Escolha conforme escala da área." },
        risk_level: "MEDIO",
        checklist_field: ["Fotos dos sintomas", "Histórico de aplicações", "Dados climáticos", "Amostragem"],
        disclaimer: "Este laudo é apoio à decisão. Consulte um responsável técnico habilitado quando necessário.",
      };
    }

    content.profile_footer = profileFooter;
    content.profile_type = profile?.profile_type ?? "agronomo";
    content.has_signature = profile?.has_signature ?? false;
    content.signature_url = profile?.signature_url ?? null;

    const { data: report, error } = await supabase.from("reports").insert({ user_id: userData.user.id, case_id, title: content.title, content }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (profile?.profile_type === "produtor") {
      const token = crypto.randomBytes(32).toString("hex");
      await supabase.from("laudo_signatures").insert({ report_id: report.id, token, status: "pending", created_at: new Date().toISOString() });
      content.signature_token = token;
    }

    let remainingLaudos = owner ? PLAN_CONFIG.owner.laudos_limit : laudosLimit - laudosUsed;
    if (!owner) {
      const usageResult = await consumeLaudoUsage({ userId: userData.user.id, requestId, meta: { report_id: report.id, case_id, thread_id: thread_id ?? null } });
      remainingLaudos = Math.max(usageResult.limit_value - usageResult.used, 0);
    }

    return NextResponse.json({ report, signature_token: content.signature_token ?? null, remaining_laudos: remainingLaudos, requestId });
  } catch (error: unknown) {
    await recordSystemLog({ level: "error", source: "api/laudos", message: "Falha ao gerar laudo.", details: summarizeError(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao gerar laudo." }, { status: 500 });
  }
}
