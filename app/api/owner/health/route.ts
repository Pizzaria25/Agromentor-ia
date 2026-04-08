import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth";
import { recordSystemLog, summarizeError } from "@/lib/system-log";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

    const admin = createAdminClient();
    const { data: ownUsage } = await admin.from("usage_limits").select("plan,is_owner").eq("user_id", user.id).maybeSingle();
    const ownerAllowed = isOwnerEmail(user.email) || ownUsage?.is_owner === true || ownUsage?.plan === "owner";
    if (!ownerAllowed) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const env = {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      OWNER_EMAILS: Boolean(
        process.env.OWNER_EMAILS ||
        process.env.DEV_ADMIN_EMAILS ||
        process.env.NEXT_PUBLIC_OWNER_EMAILS
      ),
    };

    const [usageCount, profileCount, reportCount, eventCount, logCount] = await Promise.all([
      admin.from("usage_limits").select("user_id", { count: "exact", head: true }),
      admin.from("user_profiles").select("user_id", { count: "exact", head: true }),
      admin.from("reports").select("id", { count: "exact", head: true }),
      admin.from("usage_events").select("id", { count: "exact", head: true }),
      admin.from("system_logs").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      env,
      counts: {
        usage_limits: usageCount.count ?? 0,
        user_profiles: profileCount.count ?? 0,
        reports: reportCount.count ?? 0,
        usage_events: eventCount.count ?? 0,
        system_logs: logCount.count ?? 0,
      },
      checked_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    await recordSystemLog({ level: "error", source: "api/owner/health", message: "Falha ao carregar health check owner.", details: summarizeError(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao verificar saúde do sistema." }, { status: 500 });
  }
}
