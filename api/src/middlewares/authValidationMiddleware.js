const AppError = require("../utils/AppError");

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new AppError("Nome, e-mail e senha são obrigatórios.", 400));
  }

  if (typeof name !== "string" || name.trim().length < 2) {
    return next(new AppError("Nome deve ter pelo menos 2 caracteres.", 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError("E-mail inválido.", 400));
  }

  if (typeof password !== "string" || password.length < 6) {
    return next(new AppError("Senha deve ter pelo menos 6 caracteres.", 400));
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("E-mail e senha são obrigatórios.", 400));
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
