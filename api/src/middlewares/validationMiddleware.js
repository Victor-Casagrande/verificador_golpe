const { validateUrl } = require('../utils/validators');

// Middleware para verificar a validade da URL e a assinatura do payload no corpo da requisição
const validateVerificationRequest = (req, res, next) => {
  const { url, accessibility_report } = req.body;

  // 1. Validação de presença e formato da URL
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

  // 2. Correção de Segurança: Validação Estrita do Payload de Acessibilidade (Prevenção contra Data Corruption)
  if (accessibility_report !== undefined) {
    // A API só deve aceitar se for estritamente um Array
    if (!Array.isArray(accessibility_report)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'O campo accessibility_report deve ser um array estruturado.'
      });
    }
    
    // Varredura para garantir que não estão injetando strings, booleanos ou arrays aninhados maliciosos
    const isValidStructure = accessibility_report.every(
      item => typeof item === 'object' && item !== null && !Array.isArray(item)
    );
    
    if (!isValidStructure) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Estrutura inválida dentro de accessibility_report. Esperava-se um array de objetos JSON.'
      });
    }
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