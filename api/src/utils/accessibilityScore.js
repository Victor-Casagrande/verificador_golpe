const IMPACT_WEIGHTS = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1
};

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

module.exports = {
  computeAccessibilityScore,
  IMPACT_WEIGHTS
};
