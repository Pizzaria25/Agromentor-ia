import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth";
import { PLAN_CONFIG, normalizePlan } from "@/lib/plans";

import { recordSystemLog, summarizeError } from "@/lib/system-log";

const GrantSchema = z.object({
  email: z.string().email(),
  plan: z.string().min(1),
  durationDays: z.number().int().min(1).max(3650),
  canUseImages: z.boolean().optional(),
  overrideMessages: z.number().int().min(0).nullable().optional(),
  overrideLaudos: z.number().int().min(0).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

    const admin = createAdminClient();
    const { data: ownUsage } = await admin.from("usage_limits").select("is_owner,plan").eq("user_id", user.id).maybeSingle();
    const ownerAllowed = isOwnerEmail(user.email) || ownUsage?.is_owner === true || ownUsage?.plan === "owner";
    if (!ownerAllowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const body = await req.json();
    const parsed = GrantSchema.parse(body);
    const normalizedPlan = normalizePlan(parsed.plan) || "trial";
    const defaults = PLAN_CONFIG[normalizedPlan];
    const normalizedEmail = parsed.email.trim().toLowerCase();

    const profileRes = await admin.from("user_profiles").select("user_id,email,full_name").eq("email", normalizedEmail).maybeSingle();
    if (profileRes.error) throw profileRes.error;

    const targetUserId = profileRes.data?.user_id ?? null;
    if (!targetUserId) {
      return NextResponse.json({ 
        error: "Usuário não encontrado. O e-mail precisa estar cadastrado no sistema (já ter feito login ao menos uma vez)." 
      }, { status: 404 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parsed.durationDays);

    const payload = {
      user_id: targetUserId,
      plan: normalizedPlan,
      is_trial: defaults.is_trial ?? false,
      messages_limit: parsed.overrideMessages ?? defaults.messages_limit,
      laudos_limit: parsed.overrideLaudos ?? defaults.laudos_limit,
      can_use_images: parsed.canUseImages ?? defaults.can_use_images,
      is_owner: normalizedPlan === "owner",
      expires_at: normalizedPlan === "owner" ? null : expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("usage_limits").upsert(payload, { onConflict: "user_id" });
    if (error) throw error;

    await recordSystemLog({
      level: "info",
      source: "api/owner/grant",
      message: `Plano ${normalizedPlan} liberado manualmente.`,
      userId: targetUserId,
      userEmail: normalizedEmail,
      details: {
        granted_by: user.email?.toLowerCase() ?? null,
        duration_days: parsed.durationDays,
        override_messages: parsed.overrideMessages ?? null,
        override_laudos: parsed.overrideLaudos ?? null,
        can_use_images: parsed.canUseImages ?? defaults.can_use_images,
      },
    });

    return NextResponse.json({ ok: true, granted_to: normalizedEmail, plan: normalizedPlan, expires_at: normalizedPlan === "owner" ? null : expiresAt.toISOString() });
  } catch (error: unknown) {
    await recordSystemLog({ level: "error", source: "api/owner/grant", message: "Falha ao conceder plano manualmente.", details: summarizeError(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao conceder plano." }, { status: 500 });
  }
}
