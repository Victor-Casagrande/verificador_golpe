const crypto = require("crypto");
const db = require("../config/database");
const logger = require("../utils/logger");

const extractTokenSignature = (token) =>
  token.split(".")[2] ||
  crypto.createHash("sha256").update(token).digest("hex");

/** Idempotente — espelha db/init/05-blacklist-cleanup-extensions.sql */
const ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS jwt_blacklist (
      id SERIAL PRIMARY KEY,
      token_signature VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires_at
      ON jwt_blacklist (expires_at)
  `);
};

/**
 * Verifica se o JWT foi revogado (logout com blacklist).
 * Retorna false se a tabela ainda não existir — evita 500 em bancos legados.
 */
const isTokenRevoked = async (token) => {
  if (!token) return false;

  const tokenSignature = extractTokenSignature(token);

  try {
    const result = await db.query(
      "SELECT id FROM jwt_blacklist WHERE token_signature = $1 LIMIT 1",
      [tokenSignature],
    );
    return result.rowCount > 0;
  } catch (err) {
    if (err.code === "42P01") {
      logger.warn(
        "[Auth] Tabela jwt_blacklist ausente — verificação de revogação ignorada. " +
          "Execute ensureSchema na subida ou aplique db/init/05-blacklist-cleanup-extensions.sql.",
      );
      return false;
    }
    throw err;
  }
};

module.exports = {
  ensureTable,
  isTokenRevoked,
  extractTokenSignature,
};
