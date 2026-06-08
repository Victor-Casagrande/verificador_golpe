const cron = require("node-cron");
const pool = require("../config/database");
const logger = require("../utils/logger");

const scheduleCleanup = () => {
  // Expressão Cron: '0 3 * * *' = Executa diariamente às 03:00 AM
  cron.schedule("0 3 * * *", async () => {
    logger.info(
      "[CRON] Iniciando rotina de limpeza do banco de dados (Garbage Collection)...",
    );

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const historyResult = await client.query(`
        DELETE FROM url_analyses 
        WHERE created_at < NOW() - INTERVAL '90 days'
        RETURNING id;
      `);

      logger.info(
        `[CRON] Limpeza de url_analyses: ${historyResult.rowCount} registros antigos removidos.`,
      );

      // Se implementado uma tabela de invalidação de tokens (blacklist) no futuro,
      // a rotina entraria aqui para apagar tokens que já passaram da data de expiração.
      /*
      const tokenResult = await client.query(`
        DELETE FROM jwt_blacklist WHERE expires_at < NOW();
      `);
      logger.info(`[CRON] Limpeza de jwt_blacklist: ${tokenResult.rowCount} tokens expirados removidos.`);
      */

      await client.query("COMMIT");
      logger.info("[CRON] Rotina de limpeza finalizada com sucesso.");
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(
        `[CRON] Erro crítico ao executar limpeza do banco: ${error.message}`,
      );
    } finally {
      client.release();
    }
  });

  logger.info("[CRON] Rotina de limpeza de DB agendada (03:00 AM).");
};

module.exports = { scheduleCleanup };
