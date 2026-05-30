process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_local";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const stubs = require("../helpers/moduleStubs");

/**
 * Simulação completa do fluxo de autenticação LOCAL (e-mail/senha).
 *
 * Cobre os cenários reais executados pelos endpoints `/auth/register` e
 * `/auth/login`. Validamos o serviço diretamente para isolar a lógica de
 * negócio do transporte HTTP.
 *
 * Cenários:
 *   1. Registro de novo usuário → emite JWT válido.
 *   2. Registro com e-mail já existente → AppError 409.
 *   3. Login com credenciais corretas → emite JWT válido.
 *   4. Login com senha errada → AppError 401.
 *   5. Login com e-mail inexistente → AppError 401 (não vaza existência).
 *   6. Login em conta criada via OAuth (sem `password_hash`) → AppError 401
 *      orientando uso do login social.
 *
 * Stubs aplicados: `bcrypt`, `jsonwebtoken`, `pg` (no logger via winston não
 * é necessário stub porque `authService` não usa o logger).
 */

const USER_REPO_PATH = require.resolve(
  "../../src/repositories/userRepository",
);
const SERVICE_PATH = require.resolve("../../src/services/authService");

const makeBcryptStub = () => ({
  hash: async (plain) => `hashed(${plain})`,
  compare: async (plain, hash) => hash === `hashed(${plain})`,
});

const makeJwtStub = () => {
  let counter = 0;
  return {
    sign: (payload) => `jwt(${payload.sub}/${payload.email}/${++counter})`,
    verify: () => ({ sub: 1 }),
  };
};

const makeUserRepoStub = (initialUsers = []) => {
  const users = [...initialUsers];
  let nextId = users.reduce((max, u) => Math.max(max, u.id), 0) + 1;

  return {
    findByEmail: async (email) =>
      users.find((u) => u.email === email.toLowerCase().trim()) || null,
    findById: async (id) => users.find((u) => u.id === id) || null,
    create: async ({ name, email, passwordHash = null }) => {
      const user = {
        id: nextId++,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        created_at: new Date("2026-05-29T22:00:00.000Z"),
      };
      users.push(user);
      return user;
    },
    _snapshot: () => [...users],
  };
};

const loadAuthService = ({ users = [] } = {}) => {
  const userRepoStub = makeUserRepoStub(users);

  stubs.register({
    bcrypt: makeBcryptStub(),
    jsonwebtoken: makeJwtStub(),
    dotenv: { config: () => {} },
    pg: { Pool: function () { return { query: async () => ({ rows: [] }), on: () => {}, connect: () => {} }; } },
  });

  stubs.clearRequireCacheFor(SERVICE_PATH);
  stubs.clearRequireCacheFor(USER_REPO_PATH);
  stubs.clearRequireCacheFor(require.resolve("../../src/utils/jwt"));

  // O userRepository é stubado depois para garantir prioridade sobre o módulo real.
  require.cache[USER_REPO_PATH] = {
    id: USER_REPO_PATH,
    filename: USER_REPO_PATH,
    loaded: true,
    exports: userRepoStub,
  };

  const service = require("../../src/services/authService");
  return { service, userRepoStub };
};

describe("authService — fluxo de autenticação LOCAL", () => {
  beforeEach(() => {
    stubs.clearRequireCacheFor(SERVICE_PATH);
    stubs.clearRequireCacheFor(USER_REPO_PATH);
    stubs.clearRequireCacheFor(require.resolve("../../src/utils/jwt"));
  });

  afterEach(() => {
    stubs.restore();
  });

  it("registra novo usuário e devolve JWT", async () => {
    const { service, userRepoStub } = loadAuthService();

    const result = await service.register({
      name: "Maria Silva",
      email: "Maria@Email.com",
      password: "senha123",
    });

    assert.equal(result.user.email, "maria@email.com");
    assert.equal(result.user.name, "Maria Silva");
    assert.ok(result.token.startsWith("jwt("));
    assert.equal(userRepoStub._snapshot().length, 1);
    assert.equal(
      userRepoStub._snapshot()[0].password_hash,
      "hashed(senha123)",
    );
  });

  it("rejeita registro de e-mail duplicado com AppError 409", async () => {
    const { service } = loadAuthService({
      users: [
        {
          id: 1,
          name: "Existente",
          email: "dup@email.com",
          password_hash: "hashed(senha123)",
        },
      ],
    });

    await assert.rejects(
      service.register({
        name: "Outro",
        email: "dup@email.com",
        password: "senha123",
      }),
      (err) => err.status === 409 && /cadastrado/i.test(err.message),
    );
  });

  it("autentica com credenciais corretas e devolve JWT", async () => {
    const { service } = loadAuthService({
      users: [
        {
          id: 7,
          name: "João",
          email: "joao@email.com",
          password_hash: "hashed(123456)",
        },
      ],
    });

    const result = await service.login({
      email: "joao@email.com",
      password: "123456",
    });

    assert.equal(result.user.id, 7);
    assert.equal(result.user.email, "joao@email.com");
    assert.ok(result.token.includes("joao@email.com"));
  });

  it("rejeita senha incorreta com AppError 401", async () => {
    const { service } = loadAuthService({
      users: [
        {
          id: 7,
          name: "João",
          email: "joao@email.com",
          password_hash: "hashed(123456)",
        },
      ],
    });

    await assert.rejects(
      service.login({ email: "joao@email.com", password: "errada" }),
      (err) => err.status === 401,
    );
  });

  it("rejeita login de e-mail inexistente com 401 (anti-enumeration)", async () => {
    const { service } = loadAuthService();

    await assert.rejects(
      service.login({ email: "naoexiste@email.com", password: "qualquer" }),
      (err) => err.status === 401 && /Credenciais/i.test(err.message),
    );
  });

  it("rejeita login local em conta criada via OAuth (password_hash null)", async () => {
    const { service } = loadAuthService({
      users: [
        {
          id: 9,
          name: "OAuth User",
          email: "oauth@email.com",
          password_hash: null,
        },
      ],
    });

    await assert.rejects(
      service.login({ email: "oauth@email.com", password: "qualquer" }),
      (err) => err.status === 401 && /login social/i.test(err.message),
    );
  });
});
