require('dotenv').config();

require('./config/database');

const app = require('./app');
const axeService = require('./services/axeService');
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor SentryVZN rodando na porta: ${PORT}`);
  console.log('---- Informações de execução ----');
  console.log(`URL base: http://localhost:${PORT}`);
  console.log(`Health:   http://localhost:${PORT}/api/status`);
  console.log(`Docs:     http://localhost:${PORT}/api/docs`);
  console.log('');
  console.log('Scripts de teste locais (no diretório api):');
  console.log('  npm test          # testes unit + integration');
  console.log('  npm run test:urls # testar URLs contra API em execução');
  console.log('----------------------------------');
});

const shutdown = async () => {
  await axeService.closeBrowser();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
