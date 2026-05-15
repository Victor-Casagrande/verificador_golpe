const rateLimit = require('express-rate-limit');

// Configuração do rate limiter ajustada para o contexto de uma extensão de navegador.
// Como o evento document_idle aciona a varredura a cada mudança de página,
// ampliamos o limite para 1000 requisições por IP a cada 15 minutos, 
// o equivalente a mais de 1 requisição por segundo em navegação contínua.
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // limite ampliado para 1000 requisições
  message: {
    error: 'Too many requests',
    message: 'Limite de varreduras do Sentinela excedido. Por favor, aguarde alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = rateLimitMiddleware;