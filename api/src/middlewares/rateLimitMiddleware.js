const rateLimit = require('express-rate-limit');

// Configuração do rate limiter
// Limita a 100 requisições por IP a cada 15 minutos
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = rateLimitMiddleware;