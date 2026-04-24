require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importação da configuração do banco de dados (força o teste de conexão a rodar)
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Middlewares
// Permite requisições de qualquer origem (essencial para a Chrome Extension)
app.use(cors()); 

// Otimiza o servidor para receber payloads em formato JSON
// Limitamos o tamanho para 5mb, pois o relatório do Axe-core pode ser relativamente grande
app.use(express.json({ limit: '5mb' })); 

// Rota básica de Health Check para testar a comunicação
app.get('/api/status', (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'API do SentryVZN operando normalmente.',
    timestamp: new Date().toISOString()
  });
});

// Inicialização da escuta do servidor
app.listen(PORT, () => {
  console.log(`Servidor SentryVZN rodando na porta: ${PORT}`);
  console.log(`Acesse http://localhost:${PORT}/api/status para verificar a saúde da API.`);
});