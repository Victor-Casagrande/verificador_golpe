const userRepository = require("../repositories/userRepository");
const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt");
const pool = require("../config/database");
const crypto = require("crypto");

// Extrai token Bearer
const extractBearerToken = (req) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
};

// Middleware obrigatório
const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next(new AppError("Token de autenticação não informado.", 401));
    }

    const tokenSignature = token.split('.')[2] || crypto.createHash('sha256').update(token).digest('hex');
    const blacklistCheck = await pool.query('SELECT id FROM jwt_blacklist WHERE token_signature = $1', [tokenSignature]);
    if (blacklistCheck.rowCount > 0) {
      return next(new AppError('Token revogado. Faça login novamente.', 401));
    }

    const decoded = verifyToken(token);

    const user = await userRepository.findById(decoded.sub);

    if (!user) {
      return next(new AppError("Usuário não encontrado.", 401));
    }

    req.user = user;

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(new AppError("Token inválido ou expirado.", 401));
    }

    return next(error);
  }
};

// Middleware opcional
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next();
    }

    const tokenSignature = token.split('.')[2] || crypto.createHash('sha256').update(token).digest('hex');
    const blacklistCheck = await pool.query('SELECT id FROM jwt_blacklist WHERE token_signature = $1', [tokenSignature]);
    if (blacklistCheck.rowCount > 0) {
      return next();
    }

    const decoded = verifyToken(token);

    const user = await userRepository.findById(decoded.sub);

    if (user) {
      req.user = user;
    }

    return next();
  } catch {
    return next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
};
