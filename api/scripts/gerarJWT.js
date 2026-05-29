#!/usr/bin/env node
/**
 * Gera um JWT válido para um usuário existente no banco.
 *
 * Modos:
 *   1. Interativo: `npm run jwt`  — lista usuários e pede para escolher.
 *   2. Direto:    `npm run jwt -- --user-id=1` — gera sem prompt.
 *
 * Requisitos:
 *   - JWT_SECRET configurado no .env (não usamos fallback hardcoded).
 *   - Banco acessível para listar usuários (modo interativo) ou apenas
 *     para validar que o id existe (modo direto).
 *
 * O payload segue o mesmo formato usado pelo authService:
 *   { sub: <user.id>, email: <user.email> }
 * — assim o token é aceito pelo authMiddleware em produção.
 */

require("dotenv").config();
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");

if (!process.env.JWT_SECRET) {
  console.error("[gerarJWT] JWT_SECRET ausente no .env. Abortando.");
  process.exit(1);
}

const { signToken } = require("../src/utils/jwt");
const userRepository = require("../src/repositories/userRepository");
const db = require("../src/config/database");

const parseFlag = (name) => {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!arg) return null;
  return arg.slice(name.length + 3);
};

const listUsers = async (limit = 20) => {
  const result = await db.query(
    `SELECT id, name, email, created_at
       FROM users
   ORDER BY id ASC
      LIMIT $1`,
    [limit],
  );
  return result.rows;
};

const getUserById = async (id) => {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  return userRepository.findById(numeric);
};

const promptChoice = async (users) => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log("\nUsuários encontrados:");
    users.forEach((u, idx) => {
      console.log(`  [${idx + 1}] id=${u.id}  ${u.email}  (${u.name})`);
    });
    const answer = await rl.question("\nEscolha um número (ou 'q' para sair): ");
    if (answer.toLowerCase() === "q") {
      return null;
    }
    const idx = parseInt(answer, 10) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= users.length) {
      console.error("Escolha inválida.");
      return null;
    }
    return users[idx];
  } finally {
    rl.close();
  }
};

const main = async () => {
  let user = null;
  const userIdFlag = parseFlag("user-id");

  if (userIdFlag) {
    user = await getUserById(userIdFlag);
    if (!user) {
      console.error(`[gerarJWT] Usuário id=${userIdFlag} não encontrado.`);
      process.exit(1);
    }
  } else {
    const users = await listUsers();
    if (users.length === 0) {
      console.error(
        "[gerarJWT] Nenhum usuário cadastrado. Crie um via POST /auth/register " +
          "ou use 'npm run login:simulate' antes.",
      );
      process.exit(1);
    }
    user = await promptChoice(users);
    if (!user) {
      console.log("Cancelado.");
      process.exit(0);
    }
  }

  const token = signToken({ sub: user.id, email: user.email });
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  console.log("\nJWT gerado:");
  console.log(token);
  console.log("\nUso:");
  console.log(`  Authorization: Bearer ${token}`);
  console.log(`\nUsuário:    id=${user.id} <${user.email}>`);
  console.log(`Expiração:  ${expiresIn}`);

  process.exit(0);
};

main().catch((err) => {
  console.error("[gerarJWT] Erro:", err.message);
  process.exit(1);
});
