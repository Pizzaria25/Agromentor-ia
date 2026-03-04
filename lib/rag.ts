import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export async function embed(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const openai = new OpenAI({ apiKey: key });
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return res.data?.[0]?.embedding ?? null;
}

export async function retrieveContext(query: string, k = 6, category: string | null = null) {
  const embedding = await embed(query);
  if (!embedding) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: embedding,
    match_count: k,
    filter_category: category,
  });

  if (error || !data) return [];
  return data as Array<{ title: string; content: string; similarity: number; category: string | null }>;
}
