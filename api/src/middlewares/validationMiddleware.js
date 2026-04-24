const { validateUrl } = require('../utils/validators');

// Middleware para verificar a validade da URL no corpo da requisição
const validateVerificationRequest = (req, res, next) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'URL is required'
    });
  }

  if (!validateUrl(url)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid URL format'
    });
  }

  next();
};

const validateOptions = (req, res, next) => {
  const { options } = req.body;
  
  if (options && typeof options !== 'object') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Options must be an object'
    });
  }

  next();
};

module.exports = {
  validateVerificationRequest,
  validateOptions
};