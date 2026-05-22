const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,

  handler: (req, res, next, options) => {
    next(
      new AppError(
        "Limite de varreduras excedido. Por favor, aguarde alguns minutos para proteger o servidor.",
        429,
      ),
    );
  },

  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `user_${req.user.id}`;
    }

    return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  },

  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = rateLimitMiddleware;
