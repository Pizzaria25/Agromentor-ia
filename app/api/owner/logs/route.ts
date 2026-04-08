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

    const { data: logs, error } = await admin
      .from("system_logs")
      .select("id,level,source,message,details,user_email,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ logs: logs ?? [] });
  } catch (error: unknown) {
    await recordSystemLog({ level: "error", source: "api/owner/logs", message: "Falha ao carregar logs owner.", details: summarizeError(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar logs." }, { status: 500 });
  }
}
