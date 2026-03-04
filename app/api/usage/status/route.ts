import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageStatus } from "@/lib/usage";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const status = await getUsageStatus(user.id, user.email);
  return NextResponse.json(status);
}
