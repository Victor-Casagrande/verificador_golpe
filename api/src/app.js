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
const urlScoreRoutes = require('./routes/urlScoreRoutes');
const errorHandlerMiddleware = require('./middlewares/errorHandlerMiddleware');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
const securityAnalyticsRoutes = require('./routes/securityAnalyticsRoutes');
const securityAnalyticsRoutes = require('./routes/securityAnalyticsRoutes');
const accessibilityAnalyticsRoutes = require('./routes/accessibilityAnalyticsRoutes');

const app = express();

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

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/analytics/security', securityAnalyticsRoutes);

app.use('/api/analytics/security', securityAnalyticsRoutes);
app.use('/api/analytics/accessibility', accessibilityAnalyticsRoutes);

app.use('/auth', authRoutes);
app.use('/users/history', historyRoutes);
app.use('/reports', reportRoutes);
app.use('/rankings', rankingRoutes);
app.use('/urls/scores', urlScoreRoutes);
app.use('/urls/analyze', verificationRoutes);

app.get('/api/status', (req, res) => {
  res.status(200).json({
    sucesso: true,
    mensagem: 'API do SentryVZN operando normalmente.',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    sucesso: true,
    mensagem: 'Bem-vindo à API SentryVZN',
    versao: '1.0.0',
    links: {
      self: {
        href: `${baseUrl}/`,
        method: 'GET'
      },
      status: {
        href: `${baseUrl}/api/status`,
        method: 'GET'
      },
      documentacao: {
        href: `${baseUrl}/api/docs`,
        method: 'GET'
      },
      swaggerJson: {
        href: `${baseUrl}/api/docs.json`,
        method: 'GET'
      },
      autenticacao: {
        href: `${baseUrl}/auth`,
        method: 'POST'
      },
      historicoUsuarios: {
        href: `${baseUrl}/users/history`,
        method: 'GET'
      },
      relatorios: {
        href: `${baseUrl}/reports`,
        method: 'GET'
      },
      rankings: {
        href: `${baseUrl}/rankings`,
        method: 'GET'
      },
      analisarUrls: {
        href: `${baseUrl}/urls/analyze`,
        method: 'POST'
      }
    }
  });
});

app.use(errorHandlerMiddleware);

module.exports = app;