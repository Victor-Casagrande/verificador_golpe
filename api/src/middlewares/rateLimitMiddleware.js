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
  handler: (req, res, next, options) => {
    next(new AppError("Muitas requisições. Por favor, aguarde alguns minutos.", 429));
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res, next, options) => {
    next(new AppError("Limite de tentativas de login excedido. Tente novamente mais tarde.", 429));
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

const analyzeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  handler: (req, res, next, options) => {
    next(new AppError("Limite de varreduras excedido. Por favor, aguarde alguns minutos para proteger o servidor.", 429));
  },
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: true,
});

module.exports = {
  globalLimiter,
  authLimiter,
  analyzeLimiter,
};
