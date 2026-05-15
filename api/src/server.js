require('dotenv').config();

// Garante que o pool PostgreSQL seja inicializado na subida do servidor
require('./config/database');

const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor SentryVZN rodando na porta: ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}/api/status para verificar a saúde da API.`);
});
