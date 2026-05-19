const db = require('../config/database');

const saveAnalysis = async ({
  userId,
  url,
  isDanger,
  status,
  reason,
  accessibilityViolations,
  accessibilityScore
}) => {
  const result = await db.query(
    `INSERT INTO url_analyses (
       user_id, url, is_danger, status, reason,
       accessibility_violations, accessibility_score
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, url, is_danger, status, reason, accessibility_score, created_at`,
    [
      userId,
      url,
      isDanger,
      status,
      reason,
      JSON.stringify(accessibilityViolations),
      accessibilityScore
    ]
  );
  return result.rows[0];
};

const findByUserId = async (userId, { limit = 20, offset = 0 } = {}) => {
  const result = await db.query(
    `SELECT id, url, is_danger, status, reason,
            accessibility_score, accessibility_violations, created_at
     FROM url_analyses
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const countByUserId = async (userId) => {
  const result = await db.query(
    'SELECT COUNT(*)::int AS total FROM url_analyses WHERE user_id = $1',
    [userId]
  );
  return result.rows[0].total;
};

const findCachedByUrl = async (urlString) => {
  const result = await db.query(
    `SELECT id, is_danger, status, reason, accessibility_violations, accessibility_score
     FROM url_analyses
     WHERE url = $1 AND created_at >= NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC
     LIMIT 1`,
    [urlString]
  );
  return result.rows[0] || null;
};

const saveAnonymousAnalysis = async ({
  url,
  isDanger,
  status,
  reason,
  accessibilityViolations,
  accessibilityScore
}) => {
  const result = await db.query(
    `INSERT INTO url_analyses (url, is_danger, status, reason, accessibility_violations, accessibility_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      url,
      isDanger,
      status,
      reason,
      JSON.stringify(accessibilityViolations),
      accessibilityScore
    ]
  );
  return result.rows[0]?.id ?? null;
};

module.exports = {
  saveAnalysis,
  findByUserId,
  countByUserId,
  findCachedByUrl,
  saveAnonymousAnalysis
};
