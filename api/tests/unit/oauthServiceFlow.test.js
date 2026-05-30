process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_oauth_flow_secret";
process.env.GITHUB_CLIENT_ID = "gh-client-id";
process.env.GITHUB_CLIENT_SECRET = "gh-client-secret";
process.env.GITHUB_CALLBACK_URL = "http://localhost:3000/auth/oauth/github/callback";
process.env.GOOGLE_CLIENT_ID = "google-client-id";
process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/auth/oauth/google/callback";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const stubs = require("../helpers/moduleStubs");

/**
 * Simulação ponta-a-ponta dos fluxos OAuth (GitHub e Google).
 *
 * Cobrimos o ciclo completo:
 *
 *   1. buildAuthorizeUrl monta a URL com client_id, redirect_uri, scope,
 *      state assinado e (para Google) response_type/access_type/prompt/nonce.
 *   2. handleCallback:
 *      a. Valida o state (CSRF).
 *      b. Troca o code por access_token via POST no token endpoint do provedor.
 *      c. Busca o perfil do usuário no userinfo endpoint.
 *      d. Resolve ou cria o usuário no banco (unificação por e-mail).
 *      e. Linka o vínculo OAuth ao usuário.
 *      f. Assina e devolve o JWT da aplicação.
 *
 * Stubs aplicados:
 *   - `jsonwebtoken` (sign/verify reais via implementação simples).
 *   - `pg` (Pool stub vazio — repositórios são substituídos diretamente).
 *   - `userRepository`, `oauthRepository`, `utils/jwt` via require.cache.
 *   - `fetch` global é monkey-patched para devolver respostas controladas
 *     conforme a URL chamada (token endpoint / userinfo endpoint).
 */

const USER_REPO_PATH = require.resolve(
  "../../src/repositories/userRepository",
);
const OAUTH_REPO_PATH = require.resolve(
  "../../src/repositories/oauthRepository",
);
const JWT_UTIL_PATH = require.resolve("../../src/utils/jwt");
const SERVICE_PATH = require.resolve("../../src/services/oauthService");
const GITHUB_PROFILE_PATH = require.resolve(
  "../../src/oauth/fetchGithubProfile",
);
const GOOGLE_PROFILE_PATH = require.resolve(
  "../../src/oauth/fetchGoogleProfile",
);

/* ----------------------- Implementações simples ------------------------- */

/**
 * Mini-implementação de JWT compatível com o uso real:
 * - sign: cria string base64url(payload).hmac (não criptograficamente segura,
 *   mas suficiente para simular o ciclo state → callback).
 * - verify: re-deriva o hmac e devolve o payload, lançando se inválido.
 *
 * Cobre os campos `expiresIn` (relativo em segundos/strings simples).
 */
const makeJwtModule = () => {
  const crypto = require("node:crypto");

  const toB64 = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const fromB64 = (str) =>
    JSON.parse(
      Buffer.from(
        str.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );

  const sign = (payload, secret, options = {}) => {
    const exp =
      typeof options.expiresIn === "string"
        ? parseInt(options.expiresIn, 10) * 60 +
          Math.floor(Date.now() / 1000)
        : Math.floor(Date.now() / 1000) + 600;
    const fullPayload = { ...payload, iat: Math.floor(Date.now() / 1000), exp };
    const body = toB64(fullPayload);
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return `${body}.${sig}`;
  };

  const verify = (token, secret) => {
    const [body, sig] = String(token).split(".");
    if (!body || !sig) throw new Error("malformed");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    if (expected !== sig) throw new Error("invalid signature");
    const payload = fromB64(body);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error("expired");
    }
    return payload;
  };

  return { sign, verify };
};

/* ----------------------- Repositórios em memória ------------------------ */

const makeUserRepo = (initial = []) => {
  const users = [...initial];
  let nextId = users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
  return {
    findByEmail: async (email) =>
      users.find((u) => u.email === email.toLowerCase().trim()) || null,
    findById: async (id) => users.find((u) => u.id === id) || null,
    create: async ({ name, email, passwordHash = null }) => {
      const existing = users.find(
        (u) => u.email === email.toLowerCase().trim(),
      );
      if (existing) {
        const err = new Error("duplicate key value violates unique constraint");
        err.code = "23505";
        throw err;
      }
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

const makeOauthRepo = (initial = []) => {
  const links = [...initial];
  let nextId = links.reduce((m, l) => Math.max(m, l.id), 0) + 1;
  return {
    findByProvider: async (provider, providerUserId) => {
      const link = links.find(
        (l) =>
          l.provider === provider &&
          l.provider_user_id === String(providerUserId),
      );
      if (!link) return null;
      return {
        id: link.id,
        user_id: link.user_id,
        provider: link.provider,
        provider_user_id: link.provider_user_id,
        name: link._user?.name,
        email: link._user?.email,
        created_at: link._user?.created_at,
      };
    },
    linkAccount: async (userId, provider, providerUserId) => {
      const existing = links.find(
        (l) =>
          l.provider === provider &&
          l.provider_user_id === String(providerUserId),
      );
      if (existing) return null;
      const link = {
        id: nextId++,
        user_id: userId,
        provider,
        provider_user_id: String(providerUserId),
        created_at: new Date(),
      };
      links.push(link);
      return link;
    },
    findProvidersByUserId: async (userId) =>
      links
        .filter((l) => l.user_id === userId)
        .map((l) => ({
          provider: l.provider,
          provider_user_id: l.provider_user_id,
          created_at: l.created_at,
        })),
    _snapshot: () => [...links],
  };
};

/* ----------------------- Mock do `fetch` global ------------------------- */

const installFetchMock = (handlers) => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    for (const handler of handlers) {
      if (handler.match(url, options)) {
        return handler.respond(url, options);
      }
    }
    throw new Error(`[fetch mock] URL não tratada: ${url}`);
  };
  return {
    calls,
    restore: () => {
      global.fetch = originalFetch;
    },
  };
};

const okJson = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const badJson = (status, body) => ({
  ok: false,
  status,
  json: async () => body,
});

/* ----------------------------- Bootstrap -------------------------------- */

const loadService = ({ users = [], oauthLinks = [] } = {}) => {
  const userRepo = makeUserRepo(users);
  const oauthRepo = makeOauthRepo(oauthLinks);
  const jwtModule = makeJwtModule();

  stubs.register({
    jsonwebtoken: jwtModule,
    dotenv: { config: () => {} },
    pg: {
      Pool: function () {
        return {
          query: async () => ({ rows: [] }),
          on: () => {},
          connect: () => {},
        };
      },
    },
  });

  for (const p of [
    SERVICE_PATH,
    USER_REPO_PATH,
    OAUTH_REPO_PATH,
    JWT_UTIL_PATH,
    GITHUB_PROFILE_PATH,
    GOOGLE_PROFILE_PATH,
  ]) {
    stubs.clearRequireCacheFor(p);
  }

  require.cache[USER_REPO_PATH] = {
    id: USER_REPO_PATH,
    filename: USER_REPO_PATH,
    loaded: true,
    exports: userRepo,
  };
  require.cache[OAUTH_REPO_PATH] = {
    id: OAUTH_REPO_PATH,
    filename: OAUTH_REPO_PATH,
    loaded: true,
    exports: oauthRepo,
  };

  const service = require("../../src/services/oauthService");
  return { service, userRepo, oauthRepo, jwtModule };
};

/* ------------------------------- TESTES --------------------------------- */

describe("oauthService — buildAuthorizeUrl", () => {
  beforeEach(() => {
    stubs.clearRequireCacheFor(SERVICE_PATH);
  });
  afterEach(() => stubs.restore());

  it("monta URL completa do GitHub com state assinado", () => {
    const { service } = loadService();
    const url = new URL(service.buildAuthorizeUrl("github"));

    assert.equal(url.origin + url.pathname, "https://github.com/login/oauth/authorize");
    assert.equal(url.searchParams.get("client_id"), "gh-client-id");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "http://localhost:3000/auth/oauth/github/callback",
    );
    assert.equal(url.searchParams.get("scope"), "read:user user:email");
    assert.ok(url.searchParams.get("state"), "state precisa estar presente");
    assert.equal(url.searchParams.get("nonce"), null, "GitHub não usa nonce");
  });

  it("monta URL do Google com response_type/access_type/prompt/nonce", () => {
    const { service } = loadService();
    const url = new URL(service.buildAuthorizeUrl("google"));

    assert.equal(
      url.origin + url.pathname,
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    assert.equal(url.searchParams.get("client_id"), "google-client-id");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "http://localhost:3000/auth/oauth/google/callback",
    );
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("access_type"), "online");
    assert.equal(url.searchParams.get("prompt"), "select_account");
    assert.equal(url.searchParams.get("include_granted_scopes"), "true");
    assert.ok(url.searchParams.get("state"), "state assinado obrigatório");
    assert.ok(
      url.searchParams.get("nonce"),
      "Google exige nonce para OIDC",
    );
  });

  it("rejeita provedor não suportado com AppError 400", () => {
    const { service } = loadService();
    assert.throws(
      () => service.buildAuthorizeUrl("facebook"),
      (err) => err.status === 400,
    );
  });

  it("rejeita provedor sem credenciais com AppError 503", () => {
    delete process.env.GITHUB_CLIENT_ID;
    const { service } = loadService();
    assert.throws(
      () => service.buildAuthorizeUrl("github"),
      (err) => err.status === 503,
    );
    process.env.GITHUB_CLIENT_ID = "gh-client-id";
  });
});

describe("oauthService — state (CSRF)", () => {
  beforeEach(() => {
    stubs.clearRequireCacheFor(SERVICE_PATH);
  });
  afterEach(() => stubs.restore());

  it("createOAuthState devolve {state, nonce} e verifyOAuthState aceita o mesmo provedor", () => {
    const { service } = loadService();
    const { state, nonce } = service.createOAuthState("github");
    assert.ok(state.length > 0);
    assert.ok(nonce.length === 32, "nonce hex 16 bytes = 32 chars");

    const decoded = service.verifyOAuthState(state, "github");
    assert.equal(decoded.provider, "github");
    assert.equal(decoded.purpose, "oauth");
    assert.equal(decoded.nonce, nonce);
  });

  it("verifyOAuthState rejeita state de outro provedor", () => {
    const { service } = loadService();
    const { state } = service.createOAuthState("google");
    assert.throws(
      () => service.verifyOAuthState(state, "github"),
      (err) => err.status === 400,
    );
  });

  it("verifyOAuthState rejeita state adulterado/inválido", () => {
    const { service } = loadService();
    assert.throws(
      () => service.verifyOAuthState("garbage-not-a-jwt", "google"),
      (err) => err.status === 400,
    );
  });
});

describe("oauthService — handleCallback (GitHub)", () => {
  beforeEach(() => {
    stubs.clearRequireCacheFor(SERVICE_PATH);
  });
  afterEach(() => {
    stubs.restore();
  });

  it("usuário novo via GitHub: cria usuário, linka vínculo e devolve JWT", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("github");

    const fetchMock = installFetchMock([
      {
        match: (url) =>
          String(url).startsWith("https://github.com/login/oauth/access_token"),
        respond: () => okJson({ access_token: "gh-access-token" }),
      },
      {
        match: (url) => String(url) === "https://api.github.com/user",
        respond: () =>
          okJson({
            id: 555,
            login: "novousuario",
            name: "Novo Usuário",
            email: "novo@github.com",
          }),
      },
    ]);

    try {
      const result = await ctx.service.handleCallback("github", {
        code: "abc-code",
        state,
      });

      assert.equal(result.user.email, "novo@github.com");
      assert.equal(result.user.name, "Novo Usuário");
      assert.ok(result.token);
      assert.deepEqual(result.user.oauth_providers, ["github"]);

      assert.equal(ctx.userRepo._snapshot().length, 1);
      assert.equal(ctx.oauthRepo._snapshot().length, 1);
      assert.equal(ctx.oauthRepo._snapshot()[0].provider, "github");

      // Validações do POST ao token endpoint
      const tokenCall = fetchMock.calls.find((c) =>
        c.url.includes("access_token"),
      );
      assert.ok(tokenCall);
      assert.equal(tokenCall.options.method, "POST");
      const body = tokenCall.options.body.toString();
      assert.ok(body.includes("client_id=gh-client-id"));
      assert.ok(body.includes("grant_type=authorization_code"));
      assert.ok(body.includes("code=abc-code"));
    } finally {
      fetchMock.restore();
    }
  });

  it("usuário existente já vinculado: reaproveita conta, NÃO duplica link", async () => {
    const ctx = loadService({
      users: [
        {
          id: 42,
          name: "Joana",
          email: "joana@github.com",
          password_hash: null,
        },
      ],
      oauthLinks: [
        {
          id: 1,
          user_id: 42,
          provider: "github",
          provider_user_id: "777",
          created_at: new Date("2026-01-01"),
          _user: {
            name: "Joana",
            email: "joana@github.com",
            created_at: new Date("2026-01-01"),
          },
        },
      ],
    });
    const { state } = ctx.service.createOAuthState("github");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("access_token"),
        respond: () => okJson({ access_token: "gh-token" }),
      },
      {
        match: (url) => String(url) === "https://api.github.com/user",
        respond: () =>
          okJson({
            id: 777,
            login: "joana",
            name: "Joana",
            email: "joana@github.com",
          }),
      },
    ]);

    try {
      const result = await ctx.service.handleCallback("github", {
        code: "code",
        state,
      });

      assert.equal(result.user.id, 42);
      assert.equal(ctx.userRepo._snapshot().length, 1, "não cria duplicata");
      assert.equal(ctx.oauthRepo._snapshot().length, 1, "não duplica vínculo");
    } finally {
      fetchMock.restore();
    }
  });

  it("e-mail já existe em conta local: linka GitHub à mesma conta (unificação)", async () => {
    const ctx = loadService({
      users: [
        {
          id: 100,
          name: "Carlos Local",
          email: "carlos@email.com",
          password_hash: "hashed(senha)",
        },
      ],
    });
    const { state } = ctx.service.createOAuthState("github");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("access_token"),
        respond: () => okJson({ access_token: "tok" }),
      },
      {
        match: (url) => String(url) === "https://api.github.com/user",
        respond: () =>
          okJson({
            id: 999,
            login: "carlos",
            name: "Carlos GitHub",
            email: "Carlos@Email.com",
          }),
      },
    ]);

    try {
      const result = await ctx.service.handleCallback("github", {
        code: "c",
        state,
      });

      assert.equal(result.user.id, 100, "reaproveita conta local existente");
      assert.equal(ctx.userRepo._snapshot().length, 1);
      assert.equal(ctx.oauthRepo._snapshot().length, 1);
      assert.deepEqual(result.user.oauth_providers, ["github"]);
    } finally {
      fetchMock.restore();
    }
  });

  it("e-mail privado no GitHub: cai no fallback /user/emails", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("github");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("access_token"),
        respond: () => okJson({ access_token: "tok" }),
      },
      {
        match: (url) => String(url) === "https://api.github.com/user",
        respond: () =>
          okJson({ id: 1, login: "privadinho", name: "Privadinho", email: null }),
      },
      {
        match: (url) => String(url) === "https://api.github.com/user/emails",
        respond: () =>
          okJson([
            { email: "secundario@x.com", primary: false, verified: true },
            { email: "primary@x.com", primary: true, verified: true },
          ]),
      },
    ]);

    try {
      const result = await ctx.service.handleCallback("github", {
        code: "c",
        state,
      });
      assert.equal(result.user.email, "primary@x.com");
    } finally {
      fetchMock.restore();
    }
  });

  it("token endpoint do GitHub falha (HTTP 401): propaga AppError 502", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("github");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("access_token"),
        respond: () => badJson(401, { error: "bad_verification_code" }),
      },
    ]);

    try {
      await assert.rejects(
        ctx.service.handleCallback("github", { code: "c", state }),
        (err) => err.status === 502,
      );
    } finally {
      fetchMock.restore();
    }
  });

  it("callback sem code: AppError 400", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("github");

    await assert.rejects(
      ctx.service.handleCallback("github", { code: undefined, state }),
      (err) => err.status === 400,
    );
  });

  it("callback com state inválido: AppError 400", async () => {
    const ctx = loadService();
    await assert.rejects(
      ctx.service.handleCallback("github", { code: "c", state: "wrong" }),
      (err) => err.status === 400,
    );
  });
});

describe("oauthService — handleCallback (Google)", () => {
  beforeEach(() => {
    stubs.clearRequireCacheFor(SERVICE_PATH);
  });
  afterEach(() => stubs.restore());

  it("usuário novo via Google: cria conta com verified_email e devolve JWT", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("google");

    const fetchMock = installFetchMock([
      {
        match: (url) =>
          String(url) === "https://oauth2.googleapis.com/token",
        respond: () => okJson({ access_token: "gg-access-token" }),
      },
      {
        match: (url) =>
          String(url) === "https://www.googleapis.com/oauth2/v2/userinfo",
        respond: () =>
          okJson({
            id: "google-id-1234",
            email: "Maria@gmail.com",
            verified_email: true,
            name: "Maria",
          }),
      },
    ]);

    try {
      const result = await ctx.service.handleCallback("google", {
        code: "g-code",
        state,
      });

      assert.equal(result.user.email, "maria@gmail.com");
      assert.equal(result.user.name, "Maria");
      assert.ok(result.token);
      assert.deepEqual(result.user.oauth_providers, ["google"]);

      assert.equal(ctx.oauthRepo._snapshot()[0].provider, "google");
      assert.equal(
        ctx.oauthRepo._snapshot()[0].provider_user_id,
        "google-id-1234",
      );

      // Sanity-check do POST ao token endpoint
      const tokenCall = fetchMock.calls.find((c) =>
        c.url.includes("oauth2.googleapis.com/token"),
      );
      const body = tokenCall.options.body.toString();
      assert.ok(body.includes("client_id=google-client-id"));
      assert.ok(body.includes("client_secret=google-client-secret"));
      assert.ok(body.includes("grant_type=authorization_code"));
      assert.ok(body.includes("code=g-code"));
    } finally {
      fetchMock.restore();
    }
  });

  it("Google retorna verified_email=false: rejeita o login", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("google");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("oauth2.googleapis.com/token"),
        respond: () => okJson({ access_token: "x" }),
      },
      {
        match: (url) => String(url).includes("oauth2/v2/userinfo"),
        respond: () =>
          okJson({
            id: "x",
            email: "naoverif@gmail.com",
            verified_email: false,
            name: "Sem Verif",
          }),
      },
    ]);

    try {
      await assert.rejects(
        ctx.service.handleCallback("google", { code: "c", state }),
        /e-mail verificado/i,
      );
    } finally {
      fetchMock.restore();
    }
  });

  it("e-mail Google já cadastrado em outro provedor (GitHub): unifica a conta", async () => {
    const ctx = loadService({
      users: [
        {
          id: 50,
          name: "Pedro",
          email: "pedro@gmail.com",
          password_hash: null,
        },
      ],
      oauthLinks: [
        {
          id: 1,
          user_id: 50,
          provider: "github",
          provider_user_id: "gh-pedro",
          created_at: new Date("2026-01-01"),
          _user: { name: "Pedro", email: "pedro@gmail.com" },
        },
      ],
    });
    const { state } = ctx.service.createOAuthState("google");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("oauth2.googleapis.com/token"),
        respond: () => okJson({ access_token: "tok" }),
      },
      {
        match: (url) => String(url).includes("oauth2/v2/userinfo"),
        respond: () =>
          okJson({
            id: "google-pedro",
            email: "pedro@gmail.com",
            verified_email: true,
            name: "Pedro",
          }),
      },
    ]);

    try {
      const result = await ctx.service.handleCallback("google", {
        code: "c",
        state,
      });

      assert.equal(result.user.id, 50, "reaproveita usuário existente");
      assert.equal(ctx.userRepo._snapshot().length, 1);
      assert.equal(ctx.oauthRepo._snapshot().length, 2, "agora vinculado a 2 provedores");

      const providers = result.user.oauth_providers.sort();
      assert.deepEqual(providers, ["github", "google"]);
    } finally {
      fetchMock.restore();
    }
  });

  it("Google token endpoint devolve error: AppError 502", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("google");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("oauth2.googleapis.com/token"),
        respond: () =>
          okJson({
            error: "invalid_grant",
            error_description: "Malformed auth code",
          }),
      },
    ]);

    try {
      await assert.rejects(
        ctx.service.handleCallback("google", { code: "c", state }),
        (err) => err.status === 502 && /Malformed/i.test(err.message),
      );
    } finally {
      fetchMock.restore();
    }
  });

  it("Google userinfo retorna HTTP 401: erro é propagado", async () => {
    const ctx = loadService();
    const { state } = ctx.service.createOAuthState("google");

    const fetchMock = installFetchMock([
      {
        match: (url) => String(url).includes("oauth2.googleapis.com/token"),
        respond: () => okJson({ access_token: "tok" }),
      },
      {
        match: (url) => String(url).includes("oauth2/v2/userinfo"),
        respond: () => badJson(401, { error: "unauthorized" }),
      },
    ]);

    try {
      await assert.rejects(
        ctx.service.handleCallback("google", { code: "c", state }),
        /Google userinfo API/i,
      );
    } finally {
      fetchMock.restore();
    }
  });
});
