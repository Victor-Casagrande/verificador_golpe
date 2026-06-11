const userRepository = require("../repositories/userRepository");
const tokenBlacklistRepository = require("../repositories/tokenBlacklistRepository");
const AppError = require("../utils/AppError");
const { verifyToken } = require("../utils/jwt");

const extractBearerToken = (req) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
};

const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next(new AppError("Token de autenticação não informado.", 401));
    }

    if (await tokenBlacklistRepository.isTokenRevoked(token)) {
      return next(new AppError("Token revogado. Faça login novamente.", 401));
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

const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next();
    }

    if (await tokenBlacklistRepository.isTokenRevoked(token)) {
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
