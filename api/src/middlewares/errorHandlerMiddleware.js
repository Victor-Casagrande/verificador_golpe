const logger = require('../utils/logger');

// Middlware central de tratamento de erros
const errorHandlerMiddleware = (err, req, res, next) => {
  const status = err.status || 500;

  if (status >= 500) {
    logger.error(err.stack);
  } else {
    logger.warn(`${status} - ${err.message}`);
  }

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