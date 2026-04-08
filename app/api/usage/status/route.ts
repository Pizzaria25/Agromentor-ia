import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth";
import { PLAN_CONFIG } from "@/lib/plans";
import { ensureUserProvisioned, touchLastSeen } from "@/lib/provision-user";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  await ensureUserProvisioned({
    userId: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
  });

  await touchLastSeen(user.id);

  const { data: usage } = await supabase
    .from("usage_limits")
    .select(
      "messages_used,messages_limit,laudos_used,laudos_limit,can_use_images,plan,is_owner"
    )
    .eq("user_id", user.id)
    .single();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("profile_type,name,crea,institution,semester,property_name,municipality")
    .eq("user_id", user.id)
    .single();

  const owner = isOwnerEmail(user.email) || usage?.is_owner === true;

  return NextResponse.json({
    usage: {
      used: owner ? 0 : usage?.messages_used ?? 0,
      limit: owner
        ? PLAN_CONFIG.owner.messages_limit
        : usage?.messages_limit ?? PLAN_CONFIG.trial.messages_limit,
      laudos_used: owner ? 0 : usage?.laudos_used ?? 0,
      laudos_limit: owner
        ? PLAN_CONFIG.owner.laudos_limit
        : usage?.laudos_limit ?? PLAN_CONFIG.trial.laudos_limit,
      can_use_images: owner ? true : usage?.can_use_images ?? false,
      plan: owner ? "owner" : usage?.plan ?? "trial",
      is_owner: owner,
    },
    profile: profile?.profile_type && profile.profile_type !== "pendente"
      ? { type: profile.profile_type, name: profile.name }
      : null,
  });
}