const { Pool } = require("pg");
require("dotenv").config();

if (process.env.NODE_ENV === "test") {
  module.exports = {
    query: async () => ({ rows: [], rowCount: 0 }),
  };
  return;
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error(
      "Erro ao adquirir cliente do PostgreSQL. Verifique as credenciais no .env",
      err.stack,
    );
  } else {
    console.log("Conexão com o PostgreSQL estabelecida com sucesso via Pool.");
    release();
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
