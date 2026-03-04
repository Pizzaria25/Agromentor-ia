import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateCasoSchema = z.object({
  title: z.string().min(3),
  culture: z.string().optional().nullable(),
  municipality: z.string().optional().nullable(),
  area_ha: z.number().optional().nullable(),
  status: z.enum(["ABERTO", "MONITORAMENTO", "RESOLVIDO"]).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cases: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateCasoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const payload = parsed.data;

  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_id: userData.user.id,
      title: payload.title,
      culture: payload.culture ?? null,
      municipality: payload.municipality ?? null,
      area_ha: payload.area_ha ?? null,
      status: payload.status ?? "ABERTO",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ case: data });
}
