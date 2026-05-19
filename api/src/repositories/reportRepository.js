const db = require('../config/database');

const VALID_REPORT_TYPES = [
  'false_positive',
  'confirmed_scam',
  'accessibility_issue',
  'other'
];

const create = async ({ userId, urlAnalysisId, url, reportType, comment }) => {
  const result = await db.query(
    `INSERT INTO reports (user_id, url_analysis_id, url, report_type, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, url_analysis_id, url, report_type, comment, created_at`,
    [userId, urlAnalysisId || null, url, reportType, comment || null]
  );
  return result.rows[0];
};

const findWorstAccessibilitySites = async ({ limit = 10, minAnalyses = 1 } = {}) => {
  const result = await db.query(
    `SELECT
       url,
       ROUND(AVG(accessibility_score)::numeric, 2) AS avg_accessibility_score,
       MAX(accessibility_score) AS max_accessibility_score,
       COUNT(*)::int AS analysis_count,
       SUM(CASE WHEN is_danger THEN 1 ELSE 0 END)::int AS danger_count
     FROM url_analyses
     WHERE accessibility_score > 0
     GROUP BY url
     HAVING COUNT(*) >= $2
     ORDER BY avg_accessibility_score DESC, max_accessibility_score DESC
     LIMIT $1`,
    [limit, minAnalyses]
  );
  return result.rows;
};

const findReportStatsByUrl = async (limit = 10) => {
  const result = await db.query(
    `SELECT
       url,
       COUNT(*)::int AS report_count,
       COUNT(*) FILTER (WHERE report_type = 'confirmed_scam')::int AS scam_reports,
       COUNT(*) FILTER (WHERE report_type = 'false_positive')::int AS false_positive_reports,
       COUNT(*) FILTER (WHERE report_type = 'accessibility_issue')::int AS accessibility_reports
     FROM reports
     GROUP BY url
     ORDER BY report_count DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

module.exports = {
  VALID_REPORT_TYPES,
  create,
  findWorstAccessibilitySites,
  findReportStatsByUrl
};
