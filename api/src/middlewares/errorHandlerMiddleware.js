const logger = require('../utils/logger');

// Middlware central de tratamento de erros
const errorHandlerMiddleware = (err, req, res, next) => {
  logger.error(err.stack);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = errorHandlerMiddleware;