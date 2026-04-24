const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const verificationRoutes = require('./routes/verificationRoutes');
const errorHandlerMiddleware = require('./middlewares/errorHandlerMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');

const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);

// Rotas
app.use('/api/verify', verificationRoutes);

// Rota básica de Health Check para testar a comunicação
app.get('/api/status', (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'API do SentryVZN operando normalmente.',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandlerMiddleware);

module.exports = app;