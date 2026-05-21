const jwt = require("jsonwebtoken");
const AppError = require("./AppError");

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET não configurado no servidor.", 500);
  }
  return secret;
};

const signToken = (payload) => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};

module.exports = {
  signToken,
  verifyToken,
};
