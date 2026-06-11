const db = require("../config/database");

const VALID_REPORT_TYPES = [
  "false_positive",
  "confirmed_scam",
  "accessibility_issue",
  "other",
];

const create = async ({ userId, urlAnalysisId, url, reportType, comment }) => {
  const result = await db.query(
    `INSERT INTO reports (user_id, url_analysis_id, url, report_type, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, url_analysis_id, url, report_type, comment, created_at`,
    [userId, urlAnalysisId || null, url, reportType, comment || null],
  );
  return result.rows[0];
};

const findWorstAccessibilitySites = async ({
  limit = 10,
  minAnalyses = 1,
} = {}) => {
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
    [limit, minAnalyses],
  );
  return result.rows;
};

const findBestAccessibilitySites = async ({
  limit = 10,
  minAnalyses = 1,
} = {}) => {
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
    [limit, minAnalyses],
  );
  return result.rows;
};

const findByUserId = async (userId, { limit = 20, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT id, url_analysis_id, url, report_type, comment, created_at
       FROM reports
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
};

const countByUserId = async (userId) => {
  const result = await db.query(
    "SELECT COUNT(*)::int AS total FROM reports WHERE user_id = $1",
    [userId],
  );
  return result.rows[0]?.total ?? 0;
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
    [limit],
  );
  return result.rows;
};

module.exports = {
  VALID_REPORT_TYPES,
  create,
  findByUserId,
  countByUserId,
  findWorstAccessibilitySites,
  findBestAccessibilitySites,
  findReportStatsByUrl,
};
