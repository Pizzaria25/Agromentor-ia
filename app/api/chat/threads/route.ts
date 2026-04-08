import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { data: threads } = await supabase
    .from("chat_threads")
    .select("id,title,updated_at,created_at")
    .eq("user_id", userData.user.id)
    .order("updated_at", { ascending: false })
    .limit(30);

  return NextResponse.json({ threads: threads ?? [] });
}
