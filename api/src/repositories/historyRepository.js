const db = require('../config/database');

const saveAnalysis = async ({
  userId,
  url,
  siteHost,
  isDanger,
  status,
  reason,
  accessibilityViolations,
  accessibilityScore,
  qualityRating,
  axeSource = 'server',
  securityFromCache = false
}) => {
  const result = await db.query(
    `INSERT INTO url_analyses (
       user_id, url, site_host, is_danger, status, reason,
       accessibility_violations, accessibility_score, quality_rating,
       axe_source, security_from_cache
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, url, site_host, is_danger, status, reason,
               accessibility_score, quality_rating, axe_source, created_at`,
    [
      userId ?? null,
      url,
      siteHost,
      isDanger,
      status,
      reason,
      JSON.stringify(accessibilityViolations),
      accessibilityScore,
      qualityRating,
      axeSource,
      securityFromCache
    ]
  );
  return result.rows[0];
};

const saveAnonymousAnalysis = async (payload) => {
  const row = await saveAnalysis({ ...payload, userId: null });
  return row?.id ?? null;
};

const findByUserId = async (userId, { limit = 20, offset = 0, urlFilter = null } = {}) => {
  const params = [userId, limit, offset];
  let urlClause = '';

  if (urlFilter) {
    params.push(urlFilter);
    urlClause = ` AND url = $${params.length}`;
  }

  const result = await db.query(
    `SELECT id, url, site_host, is_danger, status, reason,
            accessibility_score, quality_rating, axe_source,
            accessibility_violations, security_from_cache, created_at
     FROM url_analyses
     WHERE user_id = $1${urlClause}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    params
  );
  return result.rows;
};

const countByUserId = async (userId, urlFilter = null) => {
  const params = [userId];
  let urlClause = '';

  if (urlFilter) {
    params.push(urlFilter);
    urlClause = ` AND url = $${params.length}`;
  }

  const result = await db.query(
    `SELECT COUNT(*)::int AS total FROM url_analyses WHERE user_id = $1${urlClause}`,
    params
  );
  return result.rows[0].total;
};

/** Cache apenas da camada de segurança (24h). Acessibilidade é sempre reavaliada. */
const findCachedSecurityByUrl = async (urlString) => {
  const result = await db.query(
    `SELECT is_danger, status, reason
     FROM url_analyses
     WHERE url = $1 AND created_at >= NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC
     LIMIT 1`,
    [urlString]
  );
  return result.rows[0] || null;
};

/** Histórico de notas do mesmo site/URL em datas diferentes. */
const findUrlScoreTimeline = async (urlString, { limit = 30 } = {}) => {
  const result = await db.query(
    `SELECT id, url, site_host, accessibility_score, quality_rating, axe_source,
            is_danger, status, created_at,
            jsonb_array_length(COALESCE(accessibility_violations, '[]'::jsonb)) AS violations_count
     FROM url_analyses
     WHERE url = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [urlString, limit]
  );
  return result.rows;
};

const findSiteHostTimeline = async (siteHost, { limit = 30 } = {}) => {
  const result = await db.query(
    `SELECT id, url, site_host, accessibility_score, quality_rating,
            jsonb_array_length(COALESCE(accessibility_violations, '[]'::jsonb)) AS violations_count,
            axe_source, created_at
     FROM url_analyses
     WHERE site_host = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [siteHost.toLowerCase(), limit]
  );
  return result.rows;
};

module.exports = {
  saveAnalysis,
  saveAnonymousAnalysis,
  findByUserId,
  countByUserId,
  findCachedSecurityByUrl,
  findUrlScoreTimeline,
  findSiteHostTimeline
};
