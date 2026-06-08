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

      const tokenResult = await client.query(`
        DELETE FROM jwt_blacklist WHERE expires_at < NOW();
      `);
      logger.info(`[CRON] Limpeza de jwt_blacklist: ${tokenResult.rowCount} tokens expirados removidos.`);

      const inactiveUsersResult = await client.query(`
        DELETE FROM users 
        WHERE created_at < NOW() - INTERVAL '1 year' 
        AND id NOT IN (SELECT DISTINCT user_id FROM url_analyses WHERE user_id IS NOT NULL) 
        AND id NOT IN (SELECT DISTINCT user_id FROM reports);
      `);
      logger.info(`[CRON] Limpeza de users (inativos): ${inactiveUsersResult.rowCount} contas inativas removidas.`);

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
