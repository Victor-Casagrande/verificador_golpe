require("dotenv").config();

/**
 * Camada de acesso ao PostgreSQL.
 *
 * Em ambiente de teste, exportamos um stub para evitar abrir conexões reais.
 * Em runtime, encapsulamos o Pool atrás de `query()` e expomos um `ping()`
 * usado pelo /api/status e pela camada de serviço para verificar disponibilidade.
 *
 * Resiliência:
 *   - Atualizamos uma flag interna (`available`) a cada query bem-sucedida/falha,
 *     para que o resto da aplicação consiga consultar o estado sem disparar o SQL.
 *   - Tratamos `pool.on('error')` (clientes ociosos com conexão perdida) para
 *     que uma queda transitória do Postgres NÃO derrube o processo Node.
 */

if (process.env.NODE_ENV === "test") {
  module.exports = {
    query: async () => ({ rows: [], rowCount: 0 }),
    ping: async () => ({ ok: true, latency_ms: 0 }),
    isAvailable: () => true,
  };
} else {
  const { Pool } = require("pg");

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Timeouts curtos para falhar rápido quando o banco está fora — evita
    // que a extensão fique pendurada esperando o axios/fetch de 90s.
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 5000,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) || 30000,
  });

  let available = false;
  let lastErrorAt = null;
  let lastErrorMessage = null;

  const markUnavailable = (err) => {
    available = false;
    lastErrorAt = new Date().toISOString();
    lastErrorMessage = err?.message || String(err);
  };

  const markAvailable = () => {
    if (!available) {
      console.log("[DB] Conexão com PostgreSQL restabelecida.");
    }
    available = true;
    lastErrorAt = null;
    lastErrorMessage = null;
  };

  // Probe inicial: não bloqueia o boot, apenas registra o estado.
  pool.connect((err, client, release) => {
    if (err) {
      markUnavailable(err);
      console.error(
        "[DB] Falha na conexão inicial com PostgreSQL.",
        "Verifique credenciais no .env e se o serviço está no ar.",
        `Detalhe: ${err.message}`,
      );
    } else {
      markAvailable();
      console.log("Conexão com o PostgreSQL estabelecida com sucesso via Pool.");
      release();
    }
  });

  // CRÍTICO: sem este handler, um erro em cliente ocioso (ex.: o Postgres reiniciou
  // enquanto havia conexão idle no pool) emite 'uncaughtException' e DERRUBA o
  // processo Node — exatamente o caso descrito em "falha silenciosa do banco".
  pool.on("error", (err) => {
    markUnavailable(err);
    console.error(
      "[DB] Erro em cliente ocioso do Pool — conexão será reaberta na próxima query.",
      `Detalhe: ${err.message}`,
    );
  });

  /**
   * Executa uma query atualizando o estado de disponibilidade.
   * Re-lança o erro para que o chamador decida como tratar (ex.: degradar resposta).
   */
  const query = async (text, params) => {
    try {
      const result = await pool.query(text, params);
      markAvailable();
      return result;
    } catch (err) {
      markUnavailable(err);
      throw err;
    }
  };

  /**
   * Health check leve usado pelo /api/status.
   * Roda um `SELECT 1` rápido e devolve latência.
   */
  const ping = async () => {
    const start = Date.now();
    try {
      await pool.query("SELECT 1");
      markAvailable();
      return { ok: true, latency_ms: Date.now() - start };
    } catch (err) {
      markUnavailable(err);
      return {
        ok: false,
        latency_ms: Date.now() - start,
        error: err.message,
      };
    }
  };

  const isAvailable = () => available;

  const getStatus = () => ({
    available,
    last_error_at: lastErrorAt,
    last_error_message: lastErrorMessage,
  });

  module.exports = {
    query,
    ping,
    isAvailable,
    getStatus,
  };
}
