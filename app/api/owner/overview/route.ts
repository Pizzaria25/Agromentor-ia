import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth";
import { recordSystemLog, summarizeError } from "@/lib/system-log";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

    const admin = createAdminClient();
    const { data: usage, error: usageError } = await admin
      .from("usage_limits")
      .select("user_id,plan,is_trial,messages_used,messages_limit,laudos_used,laudos_limit,can_use_images,is_owner,expires_at,updated_at");
    if (usageError) throw usageError;

    const currentUserEmail = user.email?.toLowerCase() || "";
    const ownUsage = (usage || []).find((u) => u.user_id === user.id);
    const isOwnerMode = isOwnerEmail(currentUserEmail) || ownUsage?.is_owner === true || ownUsage?.plan === "owner";
    if (!isOwnerMode) return NextResponse.json({ error: "FORBIDDEN", isOwnerMode: false, currentUserEmail }, { status: 403 });

    // Buscar perfis diretamente — sem usar auth.admin.listUsers (bloqueado no plano free)
    const { data: profiles, error: profilesError } = await admin
      .from("user_profiles")
      .select("user_id,email,full_name,name,profile_type,last_seen_at,created_at");
    if (profilesError) throw profilesError;

    const profileByUser = new Map((profiles || []).map((p) => [p.user_id, p]));
    const usageByUser = new Map((usage || []).map((u) => [u.user_id, u]));

    // Montar lista de usuários a partir dos perfis (sem depender do auth.admin)
    const allUserIds = new Set([
      ...(profiles || []).map((p) => p.user_id),
      ...(usage || []).map((u) => u.user_id),
    ]);

    const users = Array.from(allUserIds).map((userId) => {
      const p = profileByUser.get(userId);
      const u = usageByUser.get(userId);
      const messagesUsed = u?.messages_used || 0;
      const laudosUsed = u?.laudos_used || 0;
      return {
        user_id: userId,
        email: p?.email || "",
        full_name: p?.full_name || p?.name || "",
        profile_type: p?.profile_type || "pendente",
        plan: u?.plan || "trial",
        is_trial: u?.is_trial ?? true,
        messages_used: messagesUsed,
        messages_limit: u?.messages_limit || 0,
        laudos_used: laudosUsed,
        laudos_limit: u?.laudos_limit || 0,
        can_use_images: u?.can_use_images || false,
        is_owner: u?.is_owner || false,
        last_seen_at: p?.last_seen_at || null,
        registered_at: p?.created_at || null,
        expires_at: u?.expires_at || null,
        updated_at: u?.updated_at || null,
        ranking_score: messagesUsed + laudosUsed * 10 + (u?.can_use_images ? 3 : 0),
      };
    }).sort((a, b) => b.ranking_score - a.ranking_score || (a.email || "").localeCompare(b.email || ""));

    const summary = {
      total_users: users.length,
      active_paid: users.filter((u) => !["trial", "free"].includes(u.plan)).length,
      using_images: users.filter((u) => u.can_use_images).length,
      total_messages_used: users.reduce((acc, u) => acc + (u.messages_used || 0), 0),
      total_laudos_used: users.reduce((acc, u) => acc + (u.laudos_used || 0), 0),
      pending_profiles: users.filter((u) => u.profile_type === "pendente").length,
    };

    // Buscar eventos de uso para calcular custo estimado por usuário
    const { data: usageEvents } = await admin
      .from("usage_events")
      .select("user_id,event_type,quantity,estimated_cost,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    // Agrupar gastos por user_id
    const costByUser: Record<string, { messages: number; images: number; laudos: number; estimated_cost_usd: number; last_event: string }> = {};
    for (const evt of (usageEvents || [])) {
      if (!costByUser[evt.user_id]) {
        costByUser[evt.user_id] = { messages: 0, images: 0, laudos: 0, estimated_cost_usd: 0, last_event: evt.created_at };
      }
      const c = costByUser[evt.user_id];
      if (evt.event_type === "chat_message") c.messages += evt.quantity || 1;
      if (evt.event_type === "image_analysis") c.images += evt.quantity || 1;
      if (evt.event_type === "laudo") c.laudos += evt.quantity || 1;
      c.estimated_cost_usd += evt.estimated_cost || 0;
      if (evt.created_at > c.last_event) c.last_event = evt.created_at;
    }

    // Adicionar custo a cada usuário
    const usersWithCost = users.map(u => ({
      ...u,
      cost: costByUser[u.user_id] || { messages: 0, images: 0, laudos: 0, estimated_cost_usd: 0, last_event: null },
    }));

    const totalCostUsd = Object.values(costByUser).reduce((acc, c) => acc + c.estimated_cost_usd, 0);

    return NextResponse.json({ isOwnerMode, currentUserEmail, users: usersWithCost, summary: { ...summary, total_cost_usd: totalCostUsd } });
  } catch (error: unknown) {
    await recordSystemLog({ level: "error", source: "api/owner/overview", message: "Falha ao carregar visão owner.", details: summarizeError(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar visão owner." }, { status: 500 });
  }
}
