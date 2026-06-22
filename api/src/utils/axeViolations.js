/**
 * Sanitização e formatação de violações axe para persistência e modo dev.
 * Enriquece violações com Linguagem Simples (PT-BR) via axeTranslations.
 */
const { enrichWithTranslation } = require("./axeTranslations");

const DEV_MAX_VIOLATIONS = 50;
const DEV_MAX_NODES_PER_VIOLATION = 10;

/**
 * Traduz o campo impact do axe (inglês técnico) para português legível.
 * Usado nos campos que chegam ao cliente final.
 */
const IMPACT_PT = {
  critical: "Crítico",
  serious:  "Grave",
  moderate: "Moderado",
  minor:    "Leve",
};

/**
 * Sanitiza e ENRIQUECE violações do axe-core com Linguagem Simples (PT-BR).
 *
 * Cada violação retornada para o cliente agora contém:
 *   - Campos técnicos originais (id, impact, helpUrl, nodes_count)
 *   - Campos de Linguagem Simples (human_title, human_description, human_tip, wcag_reference)
 *   - impact_pt: tradução do nível de impacto para português
 *
 * Isso implementa o requisito do pré-projeto de apresentar violações em
 * linguagem acessível e preventiva, não em jargão técnico de desenvolvedor.
 */
const sanitizeViolations = (violations) => {
  if (!Array.isArray(violations)) return [];

  return violations.slice(0, DEV_MAX_VIOLATIONS).map((violation) => {
    const rawNodes = Array.isArray(violation.nodes) ? violation.nodes : [];

    const base = {
      id:          violation.id,
      impact:      violation.impact,
      impact_pt:   IMPACT_PT[violation.impact] ?? violation.impact,
      description: violation.description,
      helpUrl:     violation.helpUrl,
      nodes_count: rawNodes.length,
      // Preserva os seletores CSS de cada nó para que o content.js da extensão
      // possa destacar visualmente os elementos na página (highlight de acessibilidade).
      // Limitamos a 10 nós e 5 seletores por nó para manter o payload enxuto.
      nodes: rawNodes.slice(0, DEV_MAX_NODES_PER_VIOLATION).map((node) => ({
        target: Array.isArray(node.target)
          ? node.target.slice(0, 5)
          : [],
      })),
    };
    // Enriquece com tradução em Linguagem Simples
    return enrichWithTranslation(base);
  });
};

/**
 * Versão detalhada para modo dev (devMode=true).
 * Mantém nós individuais + campos de Linguagem Simples.
 */
const formatDetailedViolations = (violations) => {
  if (!Array.isArray(violations)) return [];

  return violations.slice(0, DEV_MAX_VIOLATIONS).map((violation) => {
    const base = {
      id:          violation.id,
      impact:      violation.impact,
      impact_pt:   IMPACT_PT[violation.impact] ?? violation.impact,
      tags:        violation.tags,
      description: violation.description,
      help:        violation.help,
      helpUrl:     violation.helpUrl,
      nodes: (violation.nodes || [])
        .slice(0, DEV_MAX_NODES_PER_VIOLATION)
        .map((node) => ({
          html:           node.html,
          target:         node.target,
          failureSummary: node.failureSummary,
          impact:         node.impact,
        })),
    };
    return enrichWithTranslation(base);
  });
};

module.exports = {
  sanitizeViolations,
  formatDetailedViolations,
  DEV_MAX_VIOLATIONS,
  DEV_MAX_NODES_PER_VIOLATION,
  IMPACT_PT,
};
