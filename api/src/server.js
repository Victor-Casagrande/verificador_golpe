require('dotenv').config();

// Garante que o pool PostgreSQL seja inicializado na subida do servidor
require('./config/database');

const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor SentryVZN rodando na porta: ${PORT}`);
  console.log('---- Informações de execução ----');
  console.log(`URL base: http://localhost:${PORT}`);
  console.log(`Health:   http://localhost:${PORT}/api/status`);
  console.log(`Docs:     http://localhost:${PORT}/api/docs`);
  console.log('');
  console.log('Scripts de teste locais (no diretório api):');
  console.log('  npm test          # 17 testes (unit + integration)');
  console.log('  npm run test:urls # rodar testes contra a API em execução');
  console.log('----------------------------------');
});
