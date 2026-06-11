/**
 * Garante que objetos de schema adicionados após o primeiro `docker compose up`
 * existam em bancos já provisionados (scripts em db/init só rodam na criação do volume).
 */
const logger = require("../utils/logger");
const tokenBlacklistRepository = require("../repositories/tokenBlacklistRepository");

const run = async () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await tokenBlacklistRepository.ensureTable();
    logger.info("[Schema] Tabela jwt_blacklist verificada.");
  } catch (err) {
    logger.error(
      `[Schema] Falha ao garantir jwt_blacklist: ${err.message}`,
    );
    throw err;
  }
};

module.exports = { run };
