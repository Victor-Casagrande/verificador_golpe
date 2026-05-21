/**
 * Pontuação de penalidade de acessibilidade a partir das violações axe-core.
 * Usado em produção (resumo) e em modo dev (mesma base de cálculo; o detalhe fica em detailed_report).
 */
const IMPACT_WEIGHTS = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1
};

// Função para calcular a pontuação de acessibilidade a partir do relatório de violações do Axe, considerando o impacto e o número de nós afetados
const computeAccessibilityScore = (violations) => {
  if (!Array.isArray(violations) || violations.length === 0) {
    return 0;
  }

  return violations.reduce((total, violation) => {
    const weight = IMPACT_WEIGHTS[violation.impact] || 1;
    const nodes = violation.nodes_count ?? (Array.isArray(violation.nodes) ? violation.nodes.length : 1);
    return total + weight * Math.max(nodes, 1);
  }, 0);
};

/** Nota de 0–100: quanto maior, melhor a acessibilidade. */
const computeQualityRating = (penaltyScore) => {
  if (!penaltyScore || penaltyScore <= 0) {
    return 100;
  }
  return Math.max(0, 100 - Math.min(100, penaltyScore));
};

module.exports = {
  computeAccessibilityScore,
  computeQualityRating,
  IMPACT_WEIGHTS
};
