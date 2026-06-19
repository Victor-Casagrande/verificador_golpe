/**
 * Limitadores de taxa por perfil de rota (global, auth, analyze, reports).
 * A chave prioriza o ID do usuário autenticado; visitantes usam IP de origem.
 */
const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

const keyGenerator = (req) => {
  if (req.user && req.user.id) {
    return `user_${req.user.id}`;
  }
  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  handler: (req, res, next, _options) => {
    next(new AppError("Muitas requisições. Por favor, aguarde alguns minutos.", 429));
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res, next, _options) => {
    next(new AppError("Limite de tentativas de login excedido. Tente novamente mais tarde.", 429));
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

const analyzeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  handler: (req, res, next, _options) => {
    next(
      new AppError(
        "Limite de varreduras excedido. Por favor, aguarde alguns minutos para proteger o servidor.",
        429,
      ),
    );
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limite rígido de denúncias
  handler: (req, res, next, _options) => {
    next(new AppError("Muitas denúncias enviadas. Aguarde 15 minutos antes de enviar mais.", 429));
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

module.exports = {
  globalLimiter,
  authLimiter,
  analyzeLimiter,
  reportLimiter,
};
