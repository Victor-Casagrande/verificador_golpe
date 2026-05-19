require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const verificationRoutes = require('./routes/verificationRoutes');
const authRoutes = require('./routes/authRoutes');
const historyRoutes = require('./routes/historyRoutes');
const reportRoutes = require('./routes/reportRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const errorHandlerMiddleware = require('./middlewares/errorHandlerMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');

const app = express();

// Middlewares globais
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    }
  })
);
app.use(cors());
app.use(express.json({ limit: '5mb'}));
app.use(express.urlencoded({ extended: true, limit: '1mb' })); 
app.use(rateLimitMiddleware);

// Documentação OpenAPI (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Rotas
app.use('/auth', authRoutes);
app.use('/users/history', historyRoutes);
app.use('/reports', reportRoutes);
app.use('/rankings', rankingRoutes);
app.use('/urls/analyze', verificationRoutes);

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