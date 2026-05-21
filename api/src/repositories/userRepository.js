const db = require("../config/database");

const findByEmail = async (email) => {
  const result = await db.query(
    "SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1",
    [email.toLowerCase().trim()],
  );
  return result.rows[0] || null;
};

const findById = async (id) => {
  const result = await db.query(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [id],
  );
  return result.rows[0] || null;
};

const create = async ({ name, email, passwordHash = null }) => {
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name.trim(), email.toLowerCase().trim(), passwordHash],
  );
  return result.rows[0];
};

module.exports = {
  findByEmail,
  findById,
  create,
};
