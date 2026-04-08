import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: fetch report data for co-signing page
export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const supabase = await createClient();

  const { data: sig } = await supabase
    .from("laudo_signatures")
    .select("id,report_id,status,signer_name,signer_crea,signed_at")
    .eq("token", token)
    .single();

  if (!sig) return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 404 });
  if (sig.status === "signed") {
    return NextResponse.json({ error: "Este laudo já foi assinado.", already_signed: true, signer_name: sig.signer_name }, { status: 400 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("id,title,content,created_at")
    .eq("id", sig.report_id)
    .single();

  if (!report) return NextResponse.json({ error: "Laudo não encontrado." }, { status: 404 });

  return NextResponse.json({ signature_id: sig.id, report });
}

// POST: technician submits their signature
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const supabase = await createClient();

  const body = await req.json().catch(() => ({}));
  const { signer_name, signer_crea, signature_type } = body;

  if (!signer_name || !signer_crea) {
    return NextResponse.json({ error: "Nome e CREA são obrigatórios." }, { status: 400 });
  }

  const { data: sig } = await supabase
    .from("laudo_signatures")
    .select("id,report_id,status")
    .eq("token", token)
    .single();

  if (!sig) return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 404 });
  if (sig.status === "signed") return NextResponse.json({ error: "Laudo já assinado." }, { status: 400 });

  // Update signature record
  await supabase.from("laudo_signatures").update({
    status: "signed",
    signer_name,
    signer_crea,
    signature_type: signature_type || "text",
    signed_at: new Date().toISOString(),
  }).eq("id", sig.id);

  // Update report content with co-signature info
  const { data: report } = await supabase.from("reports").select("content").eq("id", sig.report_id).single();
  if (report) {
    const updatedContent = {
      ...report.content,
      co_signature: {
        signer_name,
        signer_crea,
        signed_at: new Date().toISOString(),
        signature_type,
      },
    };
    await supabase.from("reports").update({ content: updatedContent }).eq("id", sig.report_id);
  }

  return NextResponse.json({ success: true, message: "Laudo co-assinado com sucesso!" });
}
