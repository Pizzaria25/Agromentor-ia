import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";

function wrapText(text: string, maxChars: number) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "UNAUTH" }, { status: 401 });

  const { data: report, error } = await supabase
    .from("reports")
    .select("id,title,content,created_at,case_id")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !report) return NextResponse.json({ error: "Laudo não encontrado." }, { status: 404 });

  const { data: c } = await supabase
    .from("cases")
    .select("title,culture,municipality,area_ha,status")
    .eq("id", report.case_id)
    .eq("user_id", userData.user.id)
    .single();

  const content = report.content as any;

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 42;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  // Logo (opcional) - /public/logo-agromentor.png
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-agromentor.png");
    if (fs.existsSync(logoPath)) {
      const bytes = fs.readFileSync(logoPath);
      const img = await pdf.embedPng(bytes);
      const dim = img.scale(0.18);
      page.drawImage(img, { x: margin, y: y - dim.height, width: dim.width, height: dim.height });
    }
  } catch {
    // ignore
  }

  // Cabeçalho
  page.drawText("AgroMentor IA", { x: margin + 68, y: y - 18, size: 18, font: fontBold, color: rgb(0.05, 0.45, 0.22) });
  page.drawText("Laudo Técnico", { x: margin + 68, y: y - 38, size: 12, font, color: rgb(0, 0, 0) });
  y -= 70;

  function sectionTitle(t: string) {
    page.drawText(t, { x: margin, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    y -= 16;
  }

  function paragraph(t: string) {
    const lines = wrapText(String(t || ""), 92);
    for (const ln of lines) {
      if (y < margin + 60) {
        page = pdf.addPage([595.28, 841.89]);
        y = page.getHeight() - margin;
      }
      page.drawText(ln, { x: margin, y, size: 10, font, color: rgb(0, 0, 0) });
      y -= 14;
    }
    y -= 6;
  }

  // Identificação
  sectionTitle("Identificação");
  paragraph(`Título do caso: ${c?.title ?? "-"}`);
  paragraph(`Cultura/Atividade: ${c?.culture ?? content?.context?.culture ?? "-"}`);
  paragraph(`Município: ${c?.municipality ?? content?.context?.municipality ?? "-"}`);
  paragraph(`Área (ha): ${c?.area_ha ?? content?.context?.area_ha ?? "-"}`);
  paragraph(`Status: ${c?.status ?? content?.context?.status ?? "-"}`);
  paragraph(`Gerado em: ${new Date(report.created_at).toLocaleString("pt-BR")}`);

  // Resumo
  sectionTitle("Resumo");
  paragraph(content?.summary ?? "-");

  // Observações
  if (Array.isArray(content?.observations) && content.observations.length) {
    sectionTitle("Observações");
    for (const o of content.observations) paragraph(`• ${o}`);
  }

  // Hipóteses
  if (Array.isArray(content?.hypotheses) && content.hypotheses.length) {
    sectionTitle("Hipóteses e confirmação");
    for (const h of content.hypotheses) {
      paragraph(`• ${h?.name ?? "Hipótese"}`);
      paragraph(`Por quê: ${h?.why ?? "-"}`);
      paragraph(`Como confirmar: ${h?.how_to_confirm ?? "-"}`);
    }
  }

  // Recomendações
  sectionTitle("Recomendações");
  if (content?.recommendation?.immediate_actions?.length) {
    paragraph("Ações imediatas:");
    for (const it of content.recommendation.immediate_actions) paragraph(`• ${it}`);
  }
  if (content?.recommendation?.management?.length) {
    paragraph("Manejo:");
    for (const it of content.recommendation.management) paragraph(`• ${it}`);
  }
  if (content?.recommendation?.products?.length) {
    paragraph("Produtos/insumos (quando aplicável):");
    for (const it of content.recommendation.products) paragraph(`• ${it}`);
  }

  // Equipamentos
  if (content?.equipment_recommendation) {
    sectionTitle("Equipamentos recomendados");
    const items = content.equipment_recommendation.items ?? [];
    for (const it of items) paragraph(`• ${it.equipment}: ${it.why}`);
    if (content.equipment_recommendation.notes) paragraph(content.equipment_recommendation.notes);
  }

  // Checklist
  if (Array.isArray(content?.checklist_field) && content.checklist_field.length) {
    sectionTitle("Checklist de campo");
    for (const it of content.checklist_field) paragraph(`• ${it}`);
  }

  // Risco e disclaimer
  sectionTitle("Risco");
  paragraph(`Nível: ${content?.risk_level ?? "-"}`);
  sectionTitle("Responsabilidade");
  paragraph(content?.disclaimer ?? "Este laudo é apoio à decisão e não substitui responsável técnico quando exigido.");

  const pdfBytes = await pdf.save();
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=AgroMentorIA-Laudo-${report.id}.pdf`,
    },
  });
}
