const formatAnalysisRow = (row) => ({
  id: row.id,
  url: row.url,
  site_host: row.site_host,
  is_danger: row.is_danger,
  status: row.status,
  reason: row.reason,
  accessibility_score: row.accessibility_score,
  quality_rating: row.quality_rating,
  violations_count:
    row.violations_count ??
    (Array.isArray(row.accessibility_violations)
      ? row.accessibility_violations.length
      : undefined),
  axe_source: row.axe_source,
  security_from_cache: row.security_from_cache,
  created_at: row.created_at,
});

module.exports = {
  formatAnalysisRow,
};
