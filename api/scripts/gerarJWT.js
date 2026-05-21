const JWT = require('jsonwebtoken');

// Gerar um JWT para testes
const token = JWT.sign(
  {
    id: '12345',
    role: 'admin'
  },
  'altere_esta_chave_em_producao', // Chave secreta temporaria de produção
  { expiresIn: '1h' }
);

console.log('JWT Gerado:', token);