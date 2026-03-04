import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDevAdmin } from "@/lib/auth";
import OpenAI from "openai";

const Schema = z.object({
  title: z.string().min(2),
  content: z.string().min(20),
  category: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  if (!isDevAdmin(user.email)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Sem OPENAI_API_KEY no .env.local" }, { status: 400 });

  const openai = new OpenAI({ apiKey: key });
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: parsed.data.content.slice(0, 8000),
  });

  const embedding = emb.data?.[0]?.embedding;
  if (!embedding) return NextResponse.json({ error: "Falha ao gerar embedding." }, { status: 500 });

  const { error } = await supabase.from("knowledge_chunks").insert({
    title: parsed.data.title,
    content: parsed.data.content,
    category: parsed.data.category ?? null,
    source: parsed.data.source ?? null,
    embedding,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
