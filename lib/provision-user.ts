import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_CONFIG } from "@/lib/plans";
import { isOwnerEmail } from "@/lib/auth";

type EnsureUserArgs = {
  userId: string;
  email?: string | null;
  fullName?: string | null;
};

export async function ensureUserProvisioned({
  userId,
  email,
  fullName,
}: EnsureUserArgs) {
  const admin = createAdminClient();
  const normalizedEmail = (email || "").trim().toLowerCase();
  const owner = isOwnerEmail(normalizedEmail);

  const basePlan = owner ? "owner" : "trial";
  const baseMessagesLimit = owner
    ? PLAN_CONFIG.owner.messages_limit
    : PLAN_CONFIG.trial.messages_limit;
  const baseLaudosLimit = owner
    ? PLAN_CONFIG.owner.laudos_limit
    : PLAN_CONFIG.trial.laudos_limit;

  // Upsert profile — nunca falha em duplicata
  const { error: profileError } = await admin.from("user_profiles").upsert({
    user_id: userId,
    email: normalizedEmail || null,
    full_name: fullName || null,
    name: fullName || null,
    profile_type: "pendente",
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id", ignoreDuplicates: true });

  if (profileError) throw profileError;

  // Upsert usage — nunca falha em duplicata
  const { error: usageError } = await admin.from("usage_limits").upsert({
    user_id: userId,
    plan: basePlan,
    is_trial: !owner,
    messages_limit: baseMessagesLimit,
    messages_used: 0,
    laudos_limit: baseLaudosLimit,
    laudos_used: 0,
    can_use_images: owner ? true : PLAN_CONFIG.trial.can_use_images,
    is_owner: owner,
    expires_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id", ignoreDuplicates: true });

  if (usageError) throw usageError;
}

export async function touchLastSeen(userId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("user_profiles")
    .update({
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function recordUsageEvent(args: {
  userId: string;
  eventType: "chat_message" | "laudo" | "image_analysis";
  quantity?: number;
  estimatedCost?: number | null;
  meta?: Record<string, unknown> | null;
}) {
  const admin = createAdminClient();

  const { error } = await admin.from("usage_events").insert({
    user_id: args.userId,
    event_type: args.eventType,
    quantity: args.quantity ?? 1,
    estimated_cost: args.estimatedCost ?? null,
    meta: args.meta ?? null,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
}
