export function buildRecommendationGuard(text: string, culture: string, theme: string) {
  const t = (text || '').toLowerCase();
  const asksRecommendation = /(recomenda|recomendaria|qual produto|qual herbicida|qual inseticida|qual fungicida|dose|mistura|aplicar|controle)/i.test(t);
  if (!asksRecommendation) return null;

  const missing: string[] = [];
  if (culture === 'GERAL') missing.push('cultura');
  if (!/(est[aá]gio|fenol[oó]gic|cana planta|soqueira|pre|p[oó]s|emerg)/i.test(t)) missing.push('estágio fenológico ou momento da aplicação');
  if (!/(daninha|praga|doen[cç]a|alvo|esp[eé]cie|mamona|corda|lagarta|ferrugem|mancha)/i.test(t)) missing.push('alvo biológico ou espécie');
  if (!/(munic[ií]pio|estado|chuva|clima|umidade|vento)/i.test(t)) missing.push('condição de ambiente/região');

  if (missing.length === 0) return null;
  return `Há risco técnico de prescrição incompleta. Antes de recomendar produto/dose, peça e valide: ${missing.join(', ')}.`;
}

export function detectImageTask(text: string) {
  const t = (text || '').toLowerCase();
  if (/(os\b|ordem de servi[cç]o|relat[oó]rio|documento)/i.test(t)) return 'OS';
  if (/(bula|r[oó]tulo|embalagem|ingrediente ativo)/i.test(t)) return 'BULA';
  if (/(mapa|talh[aã]o|shp|kml|geotiff|tif|gr[aá]fico)/i.test(t)) return 'MAPA';
  if (/(daninha|erva|mato|invasora|trepadeira|mamona|corda-de-viola)/i.test(t)) return 'DANINHA';
  if (/(praga|lagarta|cigarrinha|broca|inseto)/i.test(t)) return 'PRAGA';
  if (/(doen[cç]a|fungo|mancha|ferrugem|seca|queima)/i.test(t)) return 'DOENCA';
  if (/(defici[eê]ncia|nutri|amarelecimento|clorose)/i.test(t)) return 'NUTRICAO';
  return 'GERAL';
}

export function imagePromptForTask(task: string) {
  switch (task) {
    case 'DANINHA':
      return 'Trate a imagem como identificação de planta infestante. Responda obrigatoriamente com: 1) grupo botânico provável; 2) espécie provável; 3) confiança (alta/média/baixa); 4) evidências visuais observadas; 5) o que falta para confirmar; 6) impacto agronômico; 7) próximo passo. Se não houver segurança, diga explicitamente que a espécie não pode ser fechada.';
    case 'OS':
      return 'Trate a imagem como documento/OS. Extraia texto legível, identifique campos estruturados e sinalize dúvidas. Não invente campos ilegíveis.';
    case 'BULA':
      return 'Trate a imagem como bula/rótulo. Extraia ingrediente ativo, concentração, formulação, cultura e restrições somente se estiver legível. Se algo não estiver legível, diga que não foi possível confirmar.';
    case 'MAPA':
      return 'Trate a imagem como mapa/gráfico. Descreva legenda, padrões visuais e limitações. Não invente valores ausentes.';
    default:
      return 'Descreva a imagem de forma técnica, com hipóteses, nível de confiança e o que falta para confirmar. Não feche diagnóstico sem evidência visual suficiente.';
  }
}
