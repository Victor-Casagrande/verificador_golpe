/**
 * Controladores de autenticação local (registro e login com e-mail/senha).
 */
const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json({ sucesso: true, ...result });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json({ sucesso: true, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};
