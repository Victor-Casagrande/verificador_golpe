const rateLimit = require("express-rate-limit");

const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: "Too many requests",
    message:
      "Limite de varreduras do Sentinela excedido. Por favor, aguarde alguns minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = rateLimitMiddleware;
