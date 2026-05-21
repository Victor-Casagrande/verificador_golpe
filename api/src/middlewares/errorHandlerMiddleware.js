const logger = require("../utils/logger");

const errorHandlerMiddleware = (err, req, res, next) => {
  const status = err.status || 500;
  const isOperational = err.isOperational || false;

  if (status >= 500) {
    logger.error(
      `[FATAL] ${err.name || "Error"}: ${err.message}\nStack: ${err.stack}`,
    );
  } else {
    logger.warn(`[API] ${status} - ${err.message}`);
  }

  const clientMessage =
    status === 500 && !isOperational
      ? "Ocorreu um erro interno no servidor. A nossa equipa técnica já foi notificada."
      : err.message || "Internal Server Error";

  res.status(status).json({
    error: {
      message: clientMessage,
      status,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = errorHandlerMiddleware;
