// Função para garantir que a string recebida é uma URL válida
const validateUrl = (urlString) => {
  try {
    // A classe URL nativa do Node.js lança um erro se o formato for inválido
    const parsedUrl = new URL(urlString);
    
    // Aceita apenas protocolos web padrão
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

module.exports = {
  validateUrl
};