require('dotenv').config();

const jwt = require('jsonwebtoken');

console.log(
  'JWT_SECRET:',
  process.env.JWT_SECRET
);

const token = jwt.sign(
  {
    id: '1',
    role: 'admin'
  },
  /*process.env.JWT_SECRET ||*/ 'altere_esta_chave_em_producao',
  {
    subject: '1',
    expiresIn: '1h'
  }
);

console.log(token);