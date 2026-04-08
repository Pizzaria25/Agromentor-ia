import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";

type AnyRecord = Record<string, unknown>;

function sanitizePdfText(value: string = ""): string {
  return value
    .normalize("NFKD")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // emojis / pictográficos
    .replace(/[\u2600-\u27BF]/gu, "") // símbolos diversos
    .replace(/\uFE0F/gu, "") // variation selector
    .replace(/\u200D/gu, "") // zero width joiner
    .replace(/[•▪◦●]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\t/g, " ")
    .replace(/\r/g, "")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function sanitizeObjectStrings<T>(input: T): T {
  if (typeof input === "string") {
    return sanitizePdfText(input) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObjectStrings(item)) as T;
  }

  if (input && typeof input === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      output[key] = sanitizeObjectStrings(value);
    }
    return output as T;
  }

  return input;
}

function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return sanitizePdfText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => asText(v))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const cleaned = sanitizePdfText(value);
    if (!cleaned) return [];
    return cleaned
      .split(/\n|;/)
      .map((item) => sanitizePdfText(item))
      .filter(Boolean);
  }

  return [];
}

function pickFirst(report: AnyRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = report[key];
    const text = asText(value);
    if (text) return text;
  }
  return fallback;
}

function pickList(report: AnyRecord, keys: string[]): string[] {
  for (const key of keys) {
    const items = asList(report[key]);
    if (items.length) return items;
  }
  return [];
}

function formatDateTime(value?: string): string {
  if (!value) {
    return new Date().toLocaleString("pt-BR");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return sanitizePdfText(value);
  }

  return parsed.toLocaleString("pt-BR");
}

function splitParagraphs(text: string): string[] {
  return sanitizePdfText(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const clean = sanitizePdfText(text);
  if (!clean) return [];

  const paragraphs = clean.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }

        if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
          currentLine = word;
        } else {
          let partial = "";
          for (const char of word) {
            const testPartial = partial + char;
            if (font.widthOfTextAtSize(testPartial, fontSize) <= maxWidth) {
              partial = testPartial;
            } else {
              if (partial) lines.push(partial);
              partial = char;
            }
          }
          currentLine = partial;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

type PdfCtx = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  width: number;
  height: number;
  y: number;
  margin: number;
  font: PDFFont;
  bold: PDFFont;
  lineHeight: number;
};

function addPage(ctx: PdfCtx): PdfCtx {
  const page = ctx.pdfDoc.addPage([595.28, 841.89]); // A4
  return {
    ...ctx,
    page,
    width: page.getWidth(),
    height: page.getHeight(),
    y: page.getHeight() - ctx.margin,
  };
}

function ensureSpace(ctx: PdfCtx, requiredHeight: number): PdfCtx {
  if (ctx.y - requiredHeight < ctx.margin) {
    return addPage(ctx);
  }
  return ctx;
}

function drawHeaderBar(ctx: PdfCtx, title: string, subtitle?: string): PdfCtx {
  ctx = ensureSpace(ctx, 90);

  const barHeight = 34;
  const barY = ctx.y - barHeight;

  ctx.page.drawRectangle({
    x: ctx.margin,
    y: barY,
    width: ctx.width - ctx.margin * 2,
    height: barHeight,
    color: rgb(0.08, 0.34, 0.20),
  });

  ctx.page.drawText(sanitizePdfText(title), {
    x: ctx.margin + 14,
    y: barY + 10,
    size: 20,
    font: ctx.bold,
    color: rgb(1, 1, 1),
  });

  ctx.y = barY - 12;

  if (subtitle) {
    ctx = drawTextBlock(ctx, subtitle, {
      fontSize: 11,
      color: rgb(0.22, 0.22, 0.22),
      gapAfter: 12,
    });
  }

  return ctx;
}

function drawMetaRow(ctx: PdfCtx, items: Array<{ label: string; value: string }>): PdfCtx {
  const filtered = items.filter((item) => item.value);
  if (!filtered.length) return ctx;

  ctx = ensureSpace(ctx, 20 + filtered.length * 16);

  for (const item of filtered) {
    const line = `${sanitizePdfText(item.label)} ${sanitizePdfText(item.value)}`;
    ctx.page.drawText(line, {
      x: ctx.margin,
      y: ctx.y,
      size: 11,
      font: ctx.font,
      color: rgb(0.15, 0.15, 0.15),
    });
    ctx.y -= 16;
  }

  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.width - ctx.margin, y: ctx.y },
    thickness: 0.7,
    color: rgb(0.75, 0.75, 0.75),
  });
  ctx.y -= 14;

  return ctx;
}

function drawSectionTitle(ctx: PdfCtx, title: string): PdfCtx {
  ctx = ensureSpace(ctx, 32);

  const boxHeight = 22;
  const boxY = ctx.y - boxHeight + 4;

  ctx.page.drawRectangle({
    x: ctx.margin,
    y: boxY,
    width: ctx.width - ctx.margin * 2,
    height: boxHeight,
    color: rgb(0.93, 0.95, 0.94),
  });

  ctx.page.drawText(sanitizePdfText(title), {
    x: ctx.margin + 10,
    y: boxY + 6,
    size: 13,
    font: ctx.bold,
    color: rgb(0.08, 0.34, 0.20),
  });

  ctx.y = boxY - 10;
  return ctx;
}

function drawTextBlock(
  ctx: PdfCtx,
  text: string,
  options?: {
    fontSize?: number;
    color?: ReturnType<typeof rgb>;
    gapAfter?: number;
  }
): PdfCtx {
  const fontSize = options?.fontSize ?? 11;
  const color = options?.color ?? rgb(0.15, 0.15, 0.15);
  const gapAfter = options?.gapAfter ?? 10;
  const maxWidth = ctx.width - ctx.margin * 2;

  const paragraphs = splitParagraphs(text);

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, ctx.font, fontSize, maxWidth);
    const needed = Math.max(lines.length, 1) * (fontSize + 4) + 4;
    ctx = ensureSpace(ctx, needed);

    if (!lines.length) {
      ctx.y -= fontSize + 4;
      continue;
    }

    for (const line of lines) {
      ctx.page.drawText(line, {
        x: ctx.margin,
        y: ctx.y,
        size: fontSize,
        font: ctx.font,
        color,
      });
      ctx.y -= fontSize + 4;
    }

    ctx.y -= 2;
  }

  ctx.y -= gapAfter;
  return ctx;
}

function drawBullets(ctx: PdfCtx, items: string[]): PdfCtx {
  if (!items.length) return ctx;

  const maxWidth = ctx.width - ctx.margin * 2 - 14;
  const fontSize = 11;

  for (const item of items) {
    const lines = wrapText(item, ctx.font, fontSize, maxWidth);
    const needed = Math.max(lines.length, 1) * (fontSize + 4) + 4;
    ctx = ensureSpace(ctx, needed);

    lines.forEach((line, index) => {
      const x = index === 0 ? ctx.margin + 14 : ctx.margin + 14;
      if (index === 0) {
        ctx.page.drawText("-", {
          x: ctx.margin,
          y: ctx.y,
          size: fontSize,
          font: ctx.bold,
          color: rgb(0.08, 0.34, 0.20),
        });
      }

      ctx.page.drawText(line, {
        x,
        y: ctx.y,
        size: fontSize,
        font: ctx.font,
        color: rgb(0.15, 0.15, 0.15),
      });

      ctx.y -= fontSize + 4;
    });

    ctx.y -= 2;
  }

  ctx.y -= 6;
  return ctx;
}

function drawFooter(ctx: PdfCtx, laudoNumber: string) {
  const footerY = 24;

  ctx.page.drawLine({
    start: { x: ctx.margin, y: footerY + 18 },
    end: { x: ctx.width - ctx.margin, y: footerY + 18 },
    thickness: 0.7,
    color: rgb(0.82, 0.82, 0.82),
  });

  ctx.page.drawText(`Laudo Nº: ${sanitizePdfText(laudoNumber)} | Documento técnico automatizado - AgroMentor IA`, {
    x: ctx.margin,
    y: footerY,
    size: 9,
    font: ctx.font,
    color: rgb(0.30, 0.30, 0.30),
  });
}

export async function buildReportPdf(report: AnyRecord): Promise<Uint8Array> {
  const safeReport = sanitizeObjectStrings(report) as AnyRecord;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let ctx: PdfCtx = {
    pdfDoc,
    page: pdfDoc.addPage([595.28, 841.89]),
    width: 595.28,
    height: 841.89,
    y: 841.89 - 42,
    margin: 42,
    font,
    bold,
    lineHeight: 15,
  };

  const laudoTitle =
    pickFirst(safeReport, ["report_title", "title"], "LAUDO TÉCNICO OPERACIONAL");
  const subtitle =
    pickFirst(safeReport, ["subtitle", "report_type", "analysis_type"], "");

  const culture = pickFirst(safeReport, ["culture", "crop"], "");
  const problem = pickFirst(safeReport, ["problem", "issue", "symptom"], "");
  const client = pickFirst(safeReport, ["client", "client_name", "user_name"], "");
  const property = pickFirst(safeReport, ["property", "farm", "location_name"], "");
  const city = pickFirst(safeReport, ["city", "municipality", "region"], "");
  const area = pickFirst(safeReport, ["area", "area_ha"], "");
  const laudoNumber = pickFirst(
    safeReport,
    ["report_number", "laudo_number", "id"],
    `AM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  );
  const reportDate = formatDateTime(
    pickFirst(safeReport, ["created_at", "date", "generated_at"], "")
  );

  const summary = pickFirst(
    safeReport,
    ["summary", "executive_summary", "technical_summary"],
    ""
  );

  const diagnosis = pickFirst(
    safeReport,
    ["diagnosis", "initial_diagnosis", "analysis"],
    ""
  );

  const checks = pickList(safeReport, ["recommended_checks", "checks", "field_checks"]);
  const actionPlan = pickList(safeReport, ["action_plan", "recommendations", "plan"]);
  const operation = pickFirst(
    safeReport,
    ["recommended_operation", "operation", "operational_guidance"],
    ""
  );
  const risks = pickList(safeReport, ["risks", "care", "cautions"]);
  const considerations = pickFirst(
    safeReport,
    ["technical_considerations", "considerations", "notes"],
    ""
  );
  const references = pickList(safeReport, ["references", "sources"]);

  ctx.page.drawText("AgroMentor IA", {
    x: ctx.margin,
    y: ctx.y,
    size: 24,
    font: ctx.bold,
    color: rgb(0.08, 0.34, 0.20),
  });

  ctx.y -= 34;
  ctx = drawHeaderBar(ctx, laudoTitle, subtitle);

  ctx = drawMetaRow(ctx, [
    { label: "Cultura:", value: culture },
    { label: "Problema:", value: problem },
    { label: "Cliente:", value: client },
    {
      label: "Propriedade:",
      value: [property, city ? `Município: ${city}` : "", area ? `Área: ${area}` : ""]
        .filter(Boolean)
        .join(" - "),
    },
    { label: "Data:", value: reportDate },
    { label: "Laudo Nº:", value: laudoNumber },
  ]);

  if (summary) {
    ctx = drawSectionTitle(ctx, "1. Resumo Técnico");
    ctx = drawTextBlock(ctx, summary);
  }

  if (diagnosis) {
    ctx = drawSectionTitle(ctx, "2. Diagnóstico Inicial");
    ctx = drawTextBlock(ctx, diagnosis);
  }

  if (checks.length) {
    ctx = drawSectionTitle(ctx, "3. Checagens Recomendadas");
    ctx = drawBullets(ctx, checks);
  }

  if (actionPlan.length) {
    ctx = drawSectionTitle(ctx, "4. Plano de Ação");
    ctx = drawBullets(ctx, actionPlan);
  }

  if (operation) {
    ctx = drawSectionTitle(ctx, "5. Operação Recomendada");
    ctx = drawTextBlock(ctx, operation);
  }

  if (risks.length) {
    ctx = drawSectionTitle(ctx, "6. Riscos e Cuidados");
    ctx = drawBullets(ctx, risks);
  }

  if (considerations) {
    ctx = drawSectionTitle(ctx, "7. Considerações Técnicas");
    ctx = drawTextBlock(ctx, considerations);
  }

  if (references.length) {
    ctx = drawSectionTitle(ctx, "8. Referências");
    ctx = drawBullets(ctx, references);
  }

  ctx = ensureSpace(ctx, 70);

  const disclaimer =
    pickFirst(
      safeReport,
      ["disclaimer"],
      "A decisão final de manejo deve considerar receituário agronômico, bula, registro do produto e legislação vigente."
    );

  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.width - ctx.margin, y: ctx.y },
    thickness: 0.7,
    color: rgb(0.82, 0.82, 0.82),
  });

  ctx.y -= 18;

  const disclaimerLines = wrapText(disclaimer, ctx.font, 9.5, ctx.width - ctx.margin * 2);
  for (const line of disclaimerLines) {
    ctx = ensureSpace(ctx, 16);
    ctx.page.drawText(line, {
      x: ctx.margin,
      y: ctx.y,
      size: 9.5,
      font: ctx.font,
      color: rgb(0.35, 0.35, 0.35),
    });
    ctx.y -= 13;
  }

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const pageCtx = { ...ctx, page };
    drawFooter(pageCtx, laudoNumber);
  }

  return await pdfDoc.save();
}