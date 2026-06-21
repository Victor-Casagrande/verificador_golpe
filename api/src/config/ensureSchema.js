/**
 * Garante que objetos de schema adicionados após o primeiro `docker compose up`
 * existam em bancos já provisionados (scripts em db/init só rodam na criação do volume).
 */
const db = require("./database");
const logger = require("../utils/logger");
const tokenBlacklistRepository = require("../repositories/tokenBlacklistRepository");

/** Idempotente — espelha db/init/06-accessibility-score-numeric.sql */
const ensureAccessibilityScoreNumeric = async () => {
  const result = await db.query(
    `SELECT data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'url_analyses'
       AND column_name = 'accessibility_score'`,
  );

  if (result.rowCount === 0) {
    return;
  }

  if (result.rows[0].data_type === "integer") {
    await db.query(`
      ALTER TABLE url_analyses
        ALTER COLUMN accessibility_score TYPE NUMERIC(7, 2)
        USING accessibility_score::numeric
    `);
    logger.info("[Schema] Coluna accessibility_score migrada de INTEGER para NUMERIC(7,2).");
  }
};

const run = async () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await tokenBlacklistRepository.ensureTable();
    logger.info("[Schema] Tabela jwt_blacklist verificada.");

    await ensureAccessibilityScoreNumeric();
  } catch (err) {
    logger.error(`[Schema] Falha ao garantir schema: ${err.message}`);
    throw err;
  }
};

module.exports = { run };
