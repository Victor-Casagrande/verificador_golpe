const db = require('../config/database');

const findByProvider = async (provider, providerUserId) => {
  const result = await db.query(
    `SELECT oa.id, oa.user_id, oa.provider, oa.provider_user_id,
            u.id AS user_id, u.name, u.email, u.created_at
     FROM oauth_accounts oa
     INNER JOIN users u ON u.id = oa.user_id
     WHERE oa.provider = $1 AND oa.provider_user_id = $2`,
    [provider, String(providerUserId)]
  );
  return result.rows[0] || null;
};

const linkAccount = async (userId, provider, providerUserId) => {
  const result = await db.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (provider, provider_user_id) DO NOTHING
     RETURNING id, user_id, provider, provider_user_id, created_at`,
    [userId, provider, String(providerUserId)]
  );
  return result.rows[0] || null;
};

const findProvidersByUserId = async (userId) => {
  const result = await db.query(
    'SELECT provider, provider_user_id, created_at FROM oauth_accounts WHERE user_id = $1',
    [userId]
  );
  return result.rows;
};

module.exports = {
  findByProvider,
  linkAccount,
  findProvidersByUserId
};
