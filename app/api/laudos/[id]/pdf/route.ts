import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(value: unknown, fallback = "-"): string {
  const v = String(value ?? "").trim();
  return v ? escapeHtml(v) : fallback;
}

function arr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "").trim()).filter(Boolean);
}

function sanitizeForHtml(value: unknown): string {
  return escapeHtml(String(value ?? ""));
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "UNAUTH" }, { status: 401 });
  }

  const { data: report, error } = await supabase
    .from("reports")
    .select("id,title,content,created_at,case_id")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !report) {
    return NextResponse.json({ error: "Laudo nao encontrado." }, { status: 404 });
  }

  const { data: c } = await supabase
    .from("cases")
    .select("title,culture,municipality,area_ha,status")
    .eq("id", report.case_id)
    .eq("user_id", userData.user.id)
    .single();

  const { data: sig } = await supabase
    .from("laudo_signatures")
    .select("signer_name,signer_crea,signed_at,status")
    .eq("report_id", id)
    .single();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("profile_type,name,crea,institution,semester,property_name,municipality,cpf")
    .eq("user_id", userData.user.id)
    .single();

  const content = (report.content || {}) as any;

  const docType =
    content?.document_type === "RELATORIO_CAMPO"
      ? "RELATORIO DE CAMPO"
      : content?.document_type === "LAUDO_ESTUDO"
        ? "LAUDO DE ESTUDO"
        : "LAUDO TECNICO OPERACIONAL";

  const laudoNum = `AM-${new Date(report.created_at).getFullYear()}-${id.slice(0, 4).toUpperCase()}`;
  const dataEmissao = new Date(report.created_at).toLocaleDateString("pt-BR");

  const riskLevel = String(content?.risk_level ?? "").toUpperCase();
  const riskColor =
    riskLevel === "ALTO" ? "#dc2626" :
    riskLevel === "MEDIO" ? "#d97706" :
    "#16a34a";

  const profileFooter =
    profile?.profile_type === "agronomo"
      ? `Eng. Agronomo: ${text(profile.name)} | CREA: ${text(profile.crea)}`
      : profile?.profile_type === "estudante"
        ? `Elaborado por: ${text(profile.name)} (Estudante) | ${text(profile.institution)} - ${text(profile.semester)}o semestre`
        : profile?.profile_type === "produtor"
          ? `Produtor: ${text(profile.name)} | CPF: ${text(profile.cpf)} | Propriedade: ${text(profile.property_name)}`
          : `Responsavel: ${text(profile?.name)} | Empresa: ${text(profile?.institution)}`;

  const observations = arr(content?.observations);
  const hypotheses = Array.isArray(content?.hypotheses) ? content.hypotheses : [];
  const immediateActions = arr(content?.recommendation?.immediate_actions);
  const management = arr(content?.recommendation?.management);
  const products = arr(content?.recommendation?.products);
  const checklist = arr(content?.checklist_field);
  const equipItems = Array.isArray(content?.equipment_recommendation?.items)
    ? content.equipment_recommendation.items
    : [];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laudo - ${text(content?.title ?? report.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
  .page { max-width: 794px; margin: 0 auto; padding: 0; }
  .header { text-align: center; padding: 24px 32px 16px; border-bottom: 3px solid #1a5c2e; }
  .logo-area { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px; }
  .logo-badge { width: 38px; height: 38px; border-radius: 12px; background: #1a5c2e; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .logo-text { font-size: 26px; font-weight: 900; color: #1a5c2e; letter-spacing: -0.5px; }
  .logo-text span { color: #4ade80; }
  .logo-sub { font-size: 10px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; }

  .title-bar { background: #1a5c2e; color: white; text-align: center; padding: 12px 32px; }
  .title-bar h1 { font-size: 18px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; }
  .title-bar p { font-size: 11px; color: rgba(255,255,255,0.85); margin-top: 2px; }

  .meta-bar { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 32px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .meta-item { font-size: 10px; color: #374151; }
  .meta-item strong { color: #1a5c2e; }

  .content { padding: 20px 32px; }
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section-title { background: #1a5c2e; color: white; padding: 6px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .section-body { padding: 0 4px; }

  .id-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .id-item { padding: 6px 10px; background: #f9fafb; border-left: 3px solid #1a5c2e; border-radius: 2px; min-height: 46px; }
  .id-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .id-value { font-size: 11px; font-weight: 600; color: #1a1a1a; margin-top: 2px; line-height: 1.4; }

  .summary-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; font-size: 11px; line-height: 1.6; color: #1a1a1a; white-space: pre-wrap; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .hypothesis { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; margin-bottom: 8px; }
  .hypothesis-name { font-weight: 700; color: #1a5c2e; font-size: 11px; margin-bottom: 4px; }
  .hypothesis-detail { font-size: 10px; color: #4b5563; line-height: 1.5; margin-top: 4px; }
  .hypothesis-label { font-weight: 600; color: #374151; }

  .action-list, .checklist { list-style: none; }
  .action-list li, .checklist li {
    padding: 5px 0 5px 16px;
    position: relative;
    font-size: 11px;
    line-height: 1.5;
    border-bottom: 1px dotted #e5e7eb;
  }
  .action-list li:last-child, .checklist li:last-child { border-bottom: none; }
  .action-list li::before {
    content: ">";
    position: absolute;
    left: 0;
    color: #1a5c2e;
    font-weight: 900;
  }
  .checklist li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    width: 10px;
    height: 10px;
    border: 1.5px solid #1a5c2e;
    border-radius: 2px;
  }

  .equip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .equip-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; text-align: center; }
  .equip-name { font-size: 10px; font-weight: 700; color: #1a5c2e; text-transform: uppercase; margin-bottom: 4px; }
  .equip-why { font-size: 9px; color: #6b7280; line-height: 1.4; }

  .risk-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 900; font-size: 13px; color: white; background: ${riskColor}; }
  .product-tag { display: inline-block; background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 3px 10px; font-size: 10px; color: #15803d; margin: 2px; font-weight: 600; }

  .cosig-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; }
  .cosig-title { font-size: 10px; font-weight: 700; color: #1a5c2e; text-transform: uppercase; margin-bottom: 4px; }
  .cosig-info { font-size: 11px; color: #1a1a1a; }

  .disclaimer { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 8px 12px; font-size: 9.5px; color: #92400e; line-height: 1.5; margin-top: 12px; }
  .study-warning { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 6px; padding: 8px 12px; text-align: center; font-size: 10px; color: #92400e; font-weight: 700; margin-bottom: 12px; }

  .footer { border-top: 2px solid #1a5c2e; padding: 12px 32px; display: flex; justify-content: space-between; align-items: center; gap: 16px; background: #f9fafb; margin-top: 8px; }
  .footer-left { font-size: 9.5px; color: #4b5563; }
  .footer-sig { font-size: 10px; color: #1a5c2e; font-weight: 600; }
  .footer-num { font-size: 9px; color: #9ca3af; margin-top: 2px; }
  .qr-placeholder { width: 60px; height: 60px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #9ca3af; text-align: center; }

  .print-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    background: #1a5c2e;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-btn { display: none; }
    .page { max-width: 100%; }
  }
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>

<div class="page">
  <div class="header">
    <div class="logo-area">
      <div class="logo-badge">AM</div>
      <div>
        <div class="logo-text">Agro<span>Mentor</span> IA</div>
        <div class="logo-sub">Plataforma Agronomica Inteligente</div>
      </div>
    </div>
  </div>

  <div class="title-bar">
    <h1>${text(docType)}</h1>
    <p>${text(content?.title ?? report.title)}</p>
  </div>

  <div class="meta-bar">
    <div class="meta-item"><strong>Data:</strong> ${text(dataEmissao)}</div>
    <div class="meta-item"><strong>Cultura:</strong> ${text(content?.context?.culture ?? c?.culture)}</div>
    <div class="meta-item"><strong>Municipio:</strong> ${text(content?.context?.municipality ?? c?.municipality)}</div>
    <div class="meta-item"><strong>Area:</strong> ${c?.area_ha ? `${escapeHtml(c.area_ha)} ha` : "-"}</div>
    <div class="meta-item"><strong>Laudo No:</strong> ${text(laudoNum)}</div>
    <div class="meta-item"><strong>Risco:</strong> <span style="color:${riskColor};font-weight:700">${text(riskLevel || "-")}</span></div>
  </div>

  <div class="content">
    ${content?.document_type === "LAUDO_ESTUDO" ? `
      <div class="study-warning">
        DOCUMENTO DE ESTUDO — Sem validade tecnica oficial para fins comerciais ou legais
      </div>
    ` : ""}

    <div class="section">
      <div class="section-title">Identificacao da Area</div>
      <div class="section-body">
        <div class="id-grid">
          <div class="id-item"><div class="id-label">Cultura / Atividade</div><div class="id-value">${text(content?.context?.culture ?? c?.culture)}</div></div>
          <div class="id-item"><div class="id-label">Municipio / Localidade</div><div class="id-value">${text(content?.context?.municipality ?? c?.municipality)}</div></div>
          <div class="id-item"><div class="id-label">Area (ha)</div><div class="id-value">${text(c?.area_ha ?? content?.context?.area_ha)}</div></div>
          <div class="id-item"><div class="id-label">Estagio Fenologico</div><div class="id-value">${text(content?.context?.stage)}</div></div>
          <div class="id-item"><div class="id-label">Plantas Afetadas</div><div class="id-value">${text(content?.context?.affected_pct)}</div></div>
          <div class="id-item"><div class="id-label">Ultima Aplicacao</div><div class="id-value">${text(content?.context?.last_application)}</div></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Resumo Tecnico</div>
      <div class="section-body">
        <div class="summary-box">${sanitizeForHtml(content?.summary ?? "-")}</div>
      </div>
    </div>

    <div class="two-col">
      <div class="section">
        <div class="section-title">Observacoes de Campo</div>
        <div class="section-body">
          <ul class="action-list">
            ${observations.length ? observations.map((o) => `<li>${sanitizeForHtml(o)}</li>`).join("") : "<li>-</li>"}
          </ul>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Hipoteses Diagnosticas</div>
        <div class="section-body">
          ${hypotheses.length ? hypotheses.map((h: any) => `
            <div class="hypothesis">
              <div class="hypothesis-name">${text(h?.name)}</div>
              <div class="hypothesis-detail"><span class="hypothesis-label">Por que:</span> ${text(h?.why)}</div>
              <div class="hypothesis-detail"><span class="hypothesis-label">Confirmar:</span> ${text(h?.how_to_confirm)}</div>
            </div>
          `).join("") : `<div class="hypothesis"><div class="hypothesis-detail">Sem hipoteses estruturadas.</div></div>`}
        </div>
      </div>
    </div>

    <div class="two-col">
      <div class="section">
        <div class="section-title">Acoes Imediatas</div>
        <div class="section-body">
          <ul class="action-list">
            ${immediateActions.length ? immediateActions.map((a) => `<li>${sanitizeForHtml(a)}</li>`).join("") : "<li>-</li>"}
          </ul>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Manejo Recomendado</div>
        <div class="section-body">
          <ul class="action-list">
            ${management.length ? management.map((m) => `<li>${sanitizeForHtml(m)}</li>`).join("") : "<li>-</li>"}
          </ul>
        </div>
      </div>
    </div>

    ${products.length ? `
      <div class="section">
        <div class="section-title">Produtos / Insumos Indicados</div>
        <div class="section-body">
          ${products.map((p) => `<span class="product-tag">${sanitizeForHtml(p)}</span>`).join("")}
        </div>
      </div>
    ` : ""}

    ${equipItems.length ? `
      <div class="section">
        <div class="section-title">Equipamentos Recomendados</div>
        <div class="section-body">
          <div class="equip-grid">
            ${equipItems.map((eq: any) => `
              <div class="equip-item">
                <div class="equip-name">${text(eq?.equipment)}</div>
                <div class="equip-why">${text(eq?.why)}</div>
              </div>
            `).join("")}
          </div>
          ${content?.equipment_recommendation?.notes ? `<p style="font-size:10px;color:#6b7280;margin-top:8px;font-style:italic">${text(content.equipment_recommendation.notes)}</p>` : ""}
        </div>
      </div>
    ` : ""}

    <div class="two-col">
      <div class="section">
        <div class="section-title">Checklist de Campo</div>
        <div class="section-body">
          <ul class="checklist">
            ${checklist.length ? checklist.map((it) => `<li>${sanitizeForHtml(it)}</li>`).join("") : "<li>-</li>"}
          </ul>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Nivel de Risco</div>
        <div class="section-body" style="padding-top:8px">
          <div class="risk-badge">${text(riskLevel || "-")}</div>
          ${content?.disclaimer ? `<div class="disclaimer" style="margin-top:10px">${sanitizeForHtml(content.disclaimer)}</div>` : ""}
        </div>
      </div>
    </div>

    ${sig?.status === "signed" ? `
      <div class="section">
        <div class="section-title">Co-Assinatura Tecnica</div>
        <div class="section-body">
          <div class="cosig-box">
            <div class="cosig-title">Laudo co-assinado por responsavel tecnico</div>
            <div class="cosig-info">${text(sig.signer_name)} | CREA: ${text(sig.signer_crea)}</div>
            <div style="font-size:9px;color:#6b7280;margin-top:2px">Assinado em: ${text(new Date(sig.signed_at).toLocaleString("pt-BR"))}</div>
          </div>
        </div>
      </div>
    ` : ""}
  </div>

  <div class="footer">
    <div class="footer-left">
      <div class="footer-sig">${profileFooter}</div>
      <div class="footer-num">Laudo No: ${text(laudoNum)} | Emitido em: ${text(dataEmissao)}</div>
      <div style="font-size:9px;color:#9ca3af;margin-top:2px">Documento gerado pelo sistema AgroMentor IA — Plataforma Agronomica Inteligente</div>
    </div>
    <div class="qr-placeholder">
      QR<br/>Code<br/>
      <span style="font-size:6px">${text(laudoNum)}</span>
    </div>
  </div>
</div>

<script>
if (window.location.search.includes('print=1')) {
  window.onload = () => setTimeout(() => window.print(), 500);
}
</script>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}