const verificationService = require('../services/verificationService');

const verifyUrl = async (req, res, next) => {
  try {
    const { url } = req.body;
    
    // Aciona a lógica de negócio principal
    const analysisResult = await verificationService.verifyUrl(url);
    
    // Retorna o JSON padronizado para a extensão ou para o frontend do Lucas
    return res.status(200).json(analysisResult);
    
  } catch (error) {
    // Se a chave do Google falhar ou houver erro de rede, envia para o errorHandlerMiddleware
    next(error);
  }
};

module.exports = {
  verifyUrl
};