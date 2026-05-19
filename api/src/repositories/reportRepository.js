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

/** Piores sites: menor quality_rating / maior penalty score. */
const findWorstAccessibilitySites = async ({ limit = 10, minAnalyses = 1 } = {}) => {
  const result = await db.query(
    `SELECT
       site_host,
       COUNT(DISTINCT url)::int AS urls_count,
       ROUND(AVG(accessibility_score)::numeric, 2) AS avg_penalty_score,
       ROUND(AVG(quality_rating)::numeric, 2) AS avg_quality_rating,
       MIN(quality_rating) AS worst_quality_rating,
       MAX(accessibility_score) AS max_penalty_score,
       COUNT(*)::int AS analysis_count,
       MAX(created_at) AS last_analyzed_at
     FROM url_analyses
     WHERE site_host IS NOT NULL
     GROUP BY site_host
     HAVING COUNT(*) >= $2
     ORDER BY avg_quality_rating ASC, avg_penalty_score DESC
     LIMIT $1`,
    [limit, minAnalyses]
  );
  return result.rows;
};

/** Melhores sites: maior quality_rating. */
const findBestAccessibilitySites = async ({ limit = 10, minAnalyses = 1 } = {}) => {
  const result = await db.query(
    `SELECT
       site_host,
       COUNT(DISTINCT url)::int AS urls_count,
       ROUND(AVG(accessibility_score)::numeric, 2) AS avg_penalty_score,
       ROUND(AVG(quality_rating)::numeric, 2) AS avg_quality_rating,
       MAX(quality_rating) AS best_quality_rating,
       MIN(accessibility_score) AS min_penalty_score,
       COUNT(*)::int AS analysis_count,
       MAX(created_at) AS last_analyzed_at
     FROM url_analyses
     WHERE site_host IS NOT NULL
     GROUP BY site_host
     HAVING COUNT(*) >= $2
     ORDER BY avg_quality_rating DESC, avg_penalty_score ASC
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
  findBestAccessibilitySites,
  findReportStatsByUrl
};
