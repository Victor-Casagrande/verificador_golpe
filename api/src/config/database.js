const { Pool } = require('pg');
require('dotenv').config();

// Instanciação do Pool com as credenciais do .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Teste imediato de conexão para garantir que o banco está operando
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao adquirir cliente do PostgreSQL. Verifique as credenciais no .env', err.stack);
  } else {
    console.log('Conexão com o PostgreSQL estabelecida com sucesso via Pool.');
    release(); // Devolve o cliente para o pool após o teste
  }
});

// Exportamos o objeto query para ser utilizado nos controllers futuramente
module.exports = {
  query: (text, params) => pool.query(text, params),
};