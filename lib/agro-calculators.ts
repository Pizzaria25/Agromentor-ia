function num(v: string) {
  return Number(v.replace(/\./g, '').replace(',', '.'));
}

function fmt(n: number, digits = 2) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

function matchNumber(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m?.[1]) return null;
  const value = num(m[1]);
  return Number.isFinite(value) ? value : null;
}

function extractAreaHa(text: string): number | null {
  return matchNumber(text, /(?:área|area|talh[aã]o|fazenda|aplicar|aplicado|hectares?|ha)\D{0,12}(\d+[\d.,]*)\s*ha\b/i)
    ?? matchNumber(text, /(\d+[\d.,]*)\s*ha\b/i);
}

function extractLha(text: string): number | null {
  return matchNumber(text, /(\d+[\d.,]*)\s*l\s*\/\s*ha\b/i);
}

function extractDosePerHa(text: string): { value: number; unit: 'L/ha' | 'mL/ha' } | null {
  const ml = matchNumber(text, /(\d+[\d.,]*)\s*ml\s*\/\s*ha\b/i);
  if (ml !== null) return { value: ml, unit: 'mL/ha' };
  const l = matchNumber(text, /(\d+[\d.,]*)\s*l\s*\/\s*ha\b/i);
  if (l !== null) return { value: l, unit: 'L/ha' };
  return null;
}

function extractTankL(text: string): number | null {
  return matchNumber(text, /tanque\D{0,15}(\d+[\d.,]*)\s*l\b/i)
    ?? matchNumber(text, /(\d+[\d.,]*)\s*l\b.{0,25}tanque/i);
}

function extractHours(text: string): number | null {
  const hhmmss = text.match(/\b(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\b/);
  if (hhmmss) {
    const h = Number(hhmmss[1] || 0);
    const m = Number(hhmmss[2] || 0);
    const s = Number(hhmmss[3] || 0);
    if ([h, m, s].every(Number.isFinite)) return h + (m / 60) + (s / 3600);
  }
  const h = matchNumber(text, /(\d+[\d.,]*)\s*h(?:oras?)?\b/i);
  if (h !== null) return h;
  const min = matchNumber(text, /(\d+[\d.,]*)\s*min(?:utos?)?\b/i);
  if (min !== null) return min / 60;
  return null;
}

export type CalcAnalysis = {
  found: boolean;
  strictAnswer?: string;
  context?: string;
};

export function analyzeCalculationRequest(text: string): CalcAnalysis {
  const t = text || '';
  const wantsCalc = /(calcule|calcular|quanto|quantos|quantas|dose|vaz[aã]o|calda|l\/ha|ml\/ha|ha\/h|hectare|tanque|tempo|horas?|minutos?)/i.test(t);
  if (!wantsCalc) return { found: false };

  const area = extractAreaHa(t);
  const lha = extractLha(t);
  const dose = extractDosePerHa(t);
  const tank = extractTankL(t);
  const hours = extractHours(t);

  const lines: string[] = [];
  const summary: string[] = [];

  if (area !== null) summary.push(`área=${fmt(area)} ha`);
  if (lha !== null) summary.push(`calda=${fmt(lha)} L/ha`);
  if (dose) summary.push(`dose=${fmt(dose.value)} ${dose.unit}`);
  if (tank !== null) summary.push(`tanque=${fmt(tank)} L`);
  if (hours !== null) summary.push(`tempo=${fmt(hours, 3)} h`);

  let computed = false;

  if (area !== null && lha !== null) {
    const totalCalda = area * lha;
    lines.push(`Volume total de calda = área × L/ha = ${fmt(area)} × ${fmt(lha)} = **${fmt(totalCalda)} L**.`);
    if (tank !== null && tank > 0) {
      const loads = totalCalda / tank;
      lines.push(`Abastecimentos teóricos = volume total ÷ tanque = ${fmt(totalCalda)} ÷ ${fmt(tank)} = **${fmt(loads, 2)} tanques**.`);
    }
    computed = true;
  }

  if (area !== null && dose) {
    const totalProduct = area * dose.value;
    lines.push(`Produto comercial total = área × dose/ha = ${fmt(area)} × ${fmt(dose.value)} = **${fmt(totalProduct)} ${dose.unit.startsWith('mL') ? 'mL' : 'L'}**.`);
    if (dose.unit === 'mL/ha') {
      lines.push(`Equivalente em litros = ${fmt(totalProduct)} mL ÷ 1000 = **${fmt(totalProduct / 1000)} L**.`);
    }
    computed = true;
  }

  if (area !== null && hours !== null && hours > 0) {
    const cap = area / hours;
    lines.push(`Capacidade operacional efetiva = área ÷ tempo = ${fmt(area)} ÷ ${fmt(hours, 3)} = **${fmt(cap)} ha/h**.`);
    computed = true;
  }

  if (hours !== null) {
    const minutes = hours * 60;
    lines.push(`Conversão de tempo: **${fmt(hours, 3)} h = ${fmt(minutes, 1)} min**.`);
    computed = true;
  }

  if (!computed) {
    const missing: string[] = [];
    if (area === null) missing.push('área em ha');
    if (lha === null && !dose) missing.push('L/ha ou dose/ha');
    return {
      found: true,
      strictAnswer: `Não dá para fechar o cálculo com segurança ainda. Faltam dados mínimos: ${missing.join(' e ')}.`,
      context: summary.length ? `Dados identificados: ${summary.join(' | ')}.` : 'Nenhum dado numérico confiável foi identificado.'
    };
  }

  return {
    found: true,
    strictAnswer: lines.join('\n'),
    context: summary.length ? `Dados identificados automaticamente: ${summary.join(' | ')}.` : undefined,
  };
}
