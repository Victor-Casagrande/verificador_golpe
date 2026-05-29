const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_callback";
process.env.GITHUB_CLIENT_ID = "gh-id";
process.env.GITHUB_CLIENT_SECRET = "gh-secret";
process.env.GITHUB_CALLBACK_URL = "http://localhost:3000/auth/oauth/github/callback";
process.env.GOOGLE_CLIENT_ID = "g-id";
process.env.GOOGLE_CLIENT_SECRET = "g-secret";
process.env.GOOGLE_CALLBACK_URL = "http://localhost:3000/auth/oauth/google/callback";

const oauthService = require("../../src/services/oauthService");
const userRepository = require("../../src/repositories/userRepository");
const oauthRepository = require("../../src/repositories/oauthRepository");
const { verifyToken } = require("../../src/utils/jwt");

/**
 * Substitui os métodos do repositório por stubs e devolve a função
 * para restaurar os originais — evita poluição entre testes.
 */
const stubRepo = (repo, overrides) => {
  const originals = {};
  for (const [k, fn] of Object.entries(overrides)) {
    originals[k] = repo[k];
    repo[k] = fn;
  }
  return () => {
    for (const [k, fn] of Object.entries(originals)) {
      repo[k] = fn;
    }
  };
};

const tokenResponse = (accessToken = "fake_access_token") => ({
  ok: true,
  status: 200,
  json: async () => ({ access_token: accessToken, token_type: "bearer" }),
});

describe("oauthService.handleCallback — fluxo completo", () => {
  let originalFetch;
  let restoreUserRepo;
  let restoreOauthRepo;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (restoreUserRepo) restoreUserRepo();
    if (restoreOauthRepo) restoreOauthRepo();
    restoreUserRepo = null;
    restoreOauthRepo = null;
  });

  it("cria novo usuário quando provedor e email são inéditos (GitHub)", async () => {
    const created = { id: 42, name: "Novo", email: "novo@foo.com", created_at: new Date() };

    restoreOauthRepo = stubRepo(oauthRepository, {
      findByProvider: async () => null,
      linkAccount: async () => ({ id: 1 }),
      findProvidersByUserId: async () => [{ provider: "github" }],
    });
    restoreUserRepo = stubRepo(userRepository, {
      findByEmail: async () => null,
      create: async ({ email }) => {
        assert.equal(email, "novo@foo.com");
        return created;
      },
    });

    global.fetch = async (url) => {
      if (url === "https://github.com/login/oauth/access_token") return tokenResponse();
      if (url === "https://api.github.com/user") {
        return {
          ok: true,
          json: async () => ({ id: 999, login: "novo", name: "Novo", email: "novo@foo.com" }),
        };
      }
      throw new Error("URL inesperada: " + url);
    };

    const state = oauthService.createOAuthState("github");
    const result = await oauthService.handleCallback("github", { code: "abc", state });

    assert.equal(result.user.id, 42);
    assert.equal(result.user.email, "novo@foo.com");
    assert.deepEqual(result.user.oauth_providers, ["github"]);

    const decoded = verifyToken(result.token);
    assert.equal(decoded.sub, 42);
    assert.equal(decoded.email, "novo@foo.com");
  });

  it("reusa conta quando o oauth_account já existe", async () => {
    restoreOauthRepo = stubRepo(oauthRepository, {
      findByProvider: async () => ({
        user_id: 10,
        name: "Existente",
        email: "ja@foo.com",
        created_at: new Date(),
      }),
      findProvidersByUserId: async () => [{ provider: "github" }],
      linkAccount: async () => {
        throw new Error("linkAccount não deveria ser chamado");
      },
    });
    restoreUserRepo = stubRepo(userRepository, {
      findByEmail: async () => {
        throw new Error("findByEmail não deveria ser chamado");
      },
      create: async () => {
        throw new Error("create não deveria ser chamado");
      },
    });

    global.fetch = async (url) => {
      if (url === "https://github.com/login/oauth/access_token") return tokenResponse();
      if (url === "https://api.github.com/user") {
        return {
          ok: true,
          json: async () => ({ id: 999, login: "ja", email: "ja@foo.com" }),
        };
      }
      throw new Error("URL inesperada");
    };

    const result = await oauthService.handleCallback("github", {
      code: "x",
      state: oauthService.createOAuthState("github"),
    });
    assert.equal(result.user.id, 10);
    assert.equal(result.user.email, "ja@foo.com");
  });

  it("vincula provedor a conta existente quando email já cadastrado (Google)", async () => {
    const existingUser = { id: 7, name: "Local", email: "mix@foo.com", created_at: new Date() };
    let linkCalled = false;

    restoreOauthRepo = stubRepo(oauthRepository, {
      findByProvider: async () => null,
      linkAccount: async (userId, provider) => {
        linkCalled = true;
        assert.equal(userId, 7);
        assert.equal(provider, "google");
        return { id: 1 };
      },
      findProvidersByUserId: async () => [{ provider: "google" }],
    });
    restoreUserRepo = stubRepo(userRepository, {
      findByEmail: async (email) => {
        assert.equal(email, "mix@foo.com");
        return existingUser;
      },
      create: async () => {
        throw new Error("create não deveria ser chamado");
      },
    });

    global.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") return tokenResponse();
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({
            id: "g-1",
            email: "mix@foo.com",
            verified_email: true,
            name: "Mix",
          }),
        };
      }
      throw new Error("URL inesperada: " + url);
    };

    const result = await oauthService.handleCallback("google", {
      code: "x",
      state: oauthService.createOAuthState("google"),
    });
    assert.equal(linkCalled, true, "linkAccount precisa rodar");
    assert.equal(result.user.id, 7);
  });

  it("propaga falha do provedor de perfil sem mascarar como sucesso", async () => {
    restoreOauthRepo = stubRepo(oauthRepository, {
      findByProvider: async () => null,
    });
    restoreUserRepo = stubRepo(userRepository, {
      findByEmail: async () => null,
      create: async () => {
        throw new Error("create não deveria ser chamado");
      },
    });

    global.fetch = async (url) => {
      if (url === "https://github.com/login/oauth/access_token") return tokenResponse();
      if (url === "https://api.github.com/user") {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      throw new Error("URL inesperada");
    };

    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "x",
        state: oauthService.createOAuthState("github"),
      }),
      /HTTP 503/,
    );
  });

  it("formatAuthResponse acrescenta { sucesso: true }", () => {
    const formatted = oauthService.formatAuthResponse({ token: "t", user: { id: 1 } });
    assert.equal(formatted.sucesso, true);
    assert.equal(formatted.token, "t");
    assert.deepEqual(formatted.user, { id: 1 });
  });
});
