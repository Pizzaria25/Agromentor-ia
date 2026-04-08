import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  // Verify thread belongs to user
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id,title,case_id")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (!thread) return NextResponse.json({ error: "Thread não encontrada." }, { status: 404 });

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("role,content,created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ thread, messages: messages ?? [] });
}
