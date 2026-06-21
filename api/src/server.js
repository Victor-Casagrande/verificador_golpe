/**
 * Ponto de entrada da API Sentinela — garante schema, agenda limpeza do banco
 * e sobe o servidor HTTP com shutdown gracioso do Chromium.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

require("./config/database");

const app = require("./app");
const axeService = require("./services/axeService");
const cleanupJob = require("./jobs/dbCleanup");
const ensureSchema = require("./config/ensureSchema");

const PORT = process.env.PORT || 3000;

let server;

const start = async () => {
  await ensureSchema.run();

  cleanupJob.scheduleCleanup();

  server = app.listen(PORT, () => {
    console.info(`[READY] Servidor Sentinela rodando na porta: ${PORT}`);
  });
};

const shutdown = async () => {
  await axeService.closeBrowser();
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch((err) => {
  console.error("[BOOT] Falha ao iniciar a API:", err.message);
  process.exit(1);
});
