import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/openai";
import { getUserPlan, includedReportsPerMonth } from "@/lib/billing";
import { startOfMonthUTC, isoDate } from "@/lib/time";

// Geração de laudo pode vir do Caso diretamente OU de um Thread do chat.
// - case_id: quando já existe um caso selecionado
// - thread_id: quando quer gerar baseado no histórico do chat (recomendado)
// - notes: observações extras do técnico/gestor (opcional)
const Schema = z
  .object({
    case_id: z.string().uuid().optional(),
    thread_id: z.string().uuid().optional(),
    notes: z.string().max(12000).optional().default(""),
  })
  .refine((v) => !!v.case_id || !!v.thread_id, {
    message: "Informe case_id ou thread_id",
  });

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
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const plan = await getUserPlan(userData.user.id, userData.user.email);
  const included = includedReportsPerMonth(plan);

  // Créditos avulsos (FREE ou extras no PRO)
  const { data: creditsRow } = await supabase
    .from("report_credits")
    .select("credits")
    .eq("user_id", userData.user.id)
    .single();
  const credits = creditsRow?.credits ?? 0;

  // Limite por mês (PRO mensal 3, PRO anual 5)
  const monthStart = isoDate(startOfMonthUTC(new Date()));
  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .gte("created_at", monthStart);

  // Regra:
  // - Se included > 0: permite até included/mês, depois pode usar créditos avulsos
  // - Se included == 0 (FREE): só permite se tiver crédito avulso
  const usedThisMonth = count ?? 0;
  const overIncluded = included > 0 ? usedThisMonth >= included : true;

  if (overIncluded && credits <= 0) {
    return NextResponse.json(
      {
        error: "NO_CREDITS",
        message:
          included > 0
            ? `Limite de laudos do mês atingido (${included}). Compre avulso ou aguarde.`
            : "Laudo completo é avulso no FREE. Veja /planos.",
      },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const { case_id: bodyCaseId, thread_id, notes } = parsed.data;

  // Se veio thread_id, descobre o case_id e puxa o histórico do chat
  let case_id = bodyCaseId;
  let chatTranscript = "";

  if (thread_id) {
    const { data: thread, error: threadErr } = await supabase
      .from("chat_threads")
      .select("id, case_id, title")
      .eq("id", thread_id)
      .eq("user_id", userData.user.id)
      .single();

    if (threadErr || !thread) return NextResponse.json({ error: "Thread não encontrado." }, { status: 404 });
    case_id = thread.case_id ?? case_id;

    // Monta transcript (últimas 24 mensagens) para o laudo ficar coerente com a conversa
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(24);

    if (msgs?.length) {
      chatTranscript = msgs
        .map((m: any) => `${m.role === "user" ? "USUÁRIO" : m.role === "assistant" ? "AGROMENTOR" : "SISTEMA"}: ${m.content}`)
        .join("\n\n");
    }
  }

  if (!case_id) {
    return NextResponse.json(
      { error: "Caso não encontrado.", message: "Abra o chat e envie uma mensagem para criar o caso automaticamente." },
      { status: 400 }
    );
  }

  const { data: c, error: caseErr } = await supabase
    .from("cases")
    .select("*")
    .eq("id", case_id)
    .eq("user_id", userData.user.id)
    .single();

  if (caseErr || !c) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

  const openai = getOpenAI();
  let content: any = null;

  if (openai) {
    const prompt = `
Você é um engenheiro agrônomo sênior. Gere um LAUDO TÉCNICO completo para agricultura e/ou pecuária.
Responda APENAS em JSON válido (sem markdown).

Campos obrigatórios:
- title: string
- context: { culture: string|null, municipality: string|null, area_ha: number|null, status: string }
- summary: string (máx 6 linhas)
- observations: string[]
- hypotheses: { name: string, why: string, how_to_confirm: string }[] (3 itens)
- recommendation: { immediate_actions: string[], management: string[], products: string[] }
- equipment_recommendation: { items: { equipment: "BOMBA_COSTAL"|"TRATOR_BARRA"|"UNIPORTE_AUTOPROPELIDO"|"DRONE"|"AVIAO"|"OUTRO", why: string }[], notes: string }
- risk_level: "BAIXO"|"MEDIO"|"ALTO"
- checklist_field: string[]
- disclaimer: string

Regras:
- Recomende equipamentos coerentes com o tipo de intervenção e escala (costal, barra, uniporte/autopropelido, drone, avião).
- Se não for caso de defensivos, recomende equipamentos coerentes (amostragem, ferramentas, manejo).
- Seja prático e objetivo.

Dados do caso:
title: ${c.title}
culture: ${c.culture ?? "null"}
municipality: ${c.municipality ?? "null"}
area_ha: ${c.area_ha ?? "null"}
status: ${c.status ?? "ABERTO"}

Histórico do chat (pode conter sintomas, histórico e decisões):
${chatTranscript || "(sem histórico disponível)"}

Anotações do operador/técnico:
${notes || "(sem observações extras)"}
`.trim();

    try {
      const resp = await openai.responses.create({
        model: "gpt-4o-mini",
        input: prompt,
      });
      const text = (resp as any).output_text ?? "";
      content = safeJsonParse(text);
    } catch (e) {
      console.error("ERRO OPENAI LAUDO >>>", e);
    }
  }

  if (!content) {
    content = {
      title: `Laudo - ${c.title}`,
      context: { culture: c.culture ?? null, municipality: c.municipality ?? null, area_ha: c.area_ha ?? null, status: c.status ?? "ABERTO" },
      summary: "Laudo gerado em modo fallback (sem IA). Configure OPENAI_API_KEY para laudo completo automático.",
      observations: ["Descreva sintomas, histórico e condições climáticas."],
      hypotheses: [
        { name: "Hipótese 1", why: "Dados insuficientes", how_to_confirm: "Coletar evidências no campo" },
        { name: "Hipótese 2", why: "Dados insuficientes", how_to_confirm: "Amostragem e inspeção" },
        { name: "Hipótese 3", why: "Dados insuficientes", how_to_confirm: "Análise complementar" },
      ],
      recommendation: { immediate_actions: ["Coletar mais informações"], management: ["Planejar manejo"], products: [] },
      equipment_recommendation: {
        items: [{ equipment: "OUTRO", why: "Avaliação em campo e coleta de dados" }],
        notes: "Escolha o equipamento conforme escala e janela operacional."
      },
      risk_level: "MEDIO",
      checklist_field: ["Fotos do sintoma", "Histórico de aplicações", "Clima", "Amostragem"],
      disclaimer: "Este laudo é apoio à decisão e não substitui responsável técnico quando exigido.",
    };
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userData.user.id,
      case_id,
      title: content.title ?? `Laudo - ${c.title}`,
      content,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Se passou do limite incluído ou é FREE, consome 1 crédito avulso
  if ((included <= 0 || (count ?? 0) >= included) && credits > 0) {
    await supabase
      .from("report_credits")
      .upsert({ user_id: userData.user.id, credits: Math.max(0, credits - 1), updated_at: new Date().toISOString() });
  }

  const remainingIncluded = included > 0 ? Math.max(0, included - ((count ?? 0) + 1)) : 0;
  const remainingCredits = (included <= 0 || (count ?? 0) >= included) ? Math.max(0, credits - 1) : credits;

  return NextResponse.json({ report: data, remaining_included: remainingIncluded, remaining_credits: remainingCredits });
}
