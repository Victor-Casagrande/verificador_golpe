/**
 * Sanitização e formatação de violações axe para persistência e modo dev.
 */
const DEV_MAX_VIOLATIONS = 50;
const DEV_MAX_NODES_PER_VIOLATION = 10;

const sanitizeViolations = (violations) => {
  if (!Array.isArray(violations)) return [];

  return violations.slice(0, DEV_MAX_VIOLATIONS).map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes_count: Array.isArray(violation.nodes) ? violation.nodes.length : 0,
  }));
};

const formatDetailedViolations = (violations) => {
  if (!Array.isArray(violations)) return [];

  return violations.slice(0, DEV_MAX_VIOLATIONS).map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    tags: violation.tags,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: (violation.nodes || []).slice(0, DEV_MAX_NODES_PER_VIOLATION).map((node) => ({
      html: node.html,
      target: node.target,
      failureSummary: node.failureSummary,
      impact: node.impact,
    })),
  }));
};

module.exports = {
  sanitizeViolations,
  formatDetailedViolations,
  DEV_MAX_VIOLATIONS,
  DEV_MAX_NODES_PER_VIOLATION,
};
