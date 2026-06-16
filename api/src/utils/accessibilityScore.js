/**
 * Pontuação de acessibilidade a partir das violações do axe-core.
 *
 * Motivação da reestruturação:
 *   O modelo antigo somava `peso × nós` de forma LINEAR e sem teto. Sites grandes
 *   (ex.: web.archive.org) acumulavam centenas de nós da MESMA regra (um
 *   color-contrast repetido em cada link), zerando a nota mesmo quando a página
 *   é, no geral, razoável. O novo modelo torna a penalização mais justa:
 *
 *   1. Retornos decrescentes por regra: `1 + log2(nós)` — repetir o mesmo
 *      problema pesa cada vez menos (2 nós ≈ 2, 8 ≈ 4, 100 ≈ teto).
 *   2. Teto por regra (`NODE_CAP_FACTOR`): uma única regra não domina a nota.
 *   3. Curva exponencial (`100 · e^(-penalidade/DECAY)`): a nota cai de forma
 *      suave e NUNCA chega a zero "no grito" — só tende a zero em páginas
 *      realmente catastróficas.
 *   4. Amortecimento por cobertura: quando o axe informa quantas regras a página
 *      PASSOU, descontamos a penalidade proporcionalmente — uma página que
 *      acerta a maioria das verificações é tratada com mais clemência.
 */

const IMPACT_WEIGHTS = {
  critical: 10,
  serious: 5,
  moderate: 2,
  minor: 1,
};

// Multiplicador máximo de nós por regra (limita o efeito de problemas repetidos).
const NODE_CAP_FACTOR = 4;

// Constante de decaimento da curva exponencial. Maior = nota cai mais devagar.
const RATING_DECAY = 150;

// Amortecimento mínimo quando a página passa quase todas as regras (0..1).
const COVERAGE_MIN_DAMPING = 0.4;

/** Fator de nós com retornos decrescentes e teto. */
const nodeFactor = (nodes) => {
  const safeNodes = Math.max(Number(nodes) || 1, 1);
  return Math.min(1 + Math.log2(safeNodes), NODE_CAP_FACTOR);
};

const resolveNodeCount = (violation) =>
  violation.nodes_count ??
  (Array.isArray(violation.nodes) ? violation.nodes.length : 1);

/**
 * Penalidade acumulada (quanto maior, pior). Cresce de forma suave graças aos
 * retornos decrescentes e ao teto por regra.
 */
const computeAccessibilityScore = (violations) => {
  if (!Array.isArray(violations) || violations.length === 0) {
    return 0;
  }

  const raw = violations.reduce((total, violation) => {
    const weight = IMPACT_WEIGHTS[violation.impact] || IMPACT_WEIGHTS.minor;
    return total + weight * nodeFactor(resolveNodeCount(violation));
  }, 0);

  return Math.round(raw * 100) / 100;
};

/**
 * Amortece a penalidade conforme a cobertura (regras que passaram vs. falharam).
 * Sem dados de `passes`, devolve 1 (sem desconto).
 */
const computeCoverageDamping = (violationsCount, passesCount) => {
  const passes = Number(passesCount) || 0;
  const fails = Number(violationsCount) || 0;
  const total = passes + fails;

  if (passes <= 0 || total <= 0) {
    return 1;
  }

  const failRatio = fails / total;
  return (
    COVERAGE_MIN_DAMPING + (1 - COVERAGE_MIN_DAMPING) * Math.min(failRatio, 1)
  );
};

/**
 * Converte a penalidade em nota 0–100 (maior = melhor) via curva exponencial.
 *
 * @param {number} penaltyScore - saída de computeAccessibilityScore
 * @param {{ violationsCount?: number, passesCount?: number }} [coverage]
 *        Dados opcionais do axe para amortecer pela cobertura.
 */
const computeQualityRating = (penaltyScore, coverage = {}) => {
  if (!penaltyScore || penaltyScore <= 0) {
    return 100;
  }

  const { violationsCount = 0, passesCount = 0 } = coverage;
  const damping = computeCoverageDamping(violationsCount, passesCount);
  const effectivePenalty = penaltyScore * damping;

  const rating = 100 * Math.exp(-effectivePenalty / RATING_DECAY);
  return Math.max(0, Math.round(rating));
};

module.exports = {
  computeAccessibilityScore,
  computeQualityRating,
  computeCoverageDamping,
  nodeFactor,
  IMPACT_WEIGHTS,
  NODE_CAP_FACTOR,
  RATING_DECAY,
  COVERAGE_MIN_DAMPING,
};
