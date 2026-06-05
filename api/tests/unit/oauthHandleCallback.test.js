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

    const { state } = oauthService.createOAuthState("github");
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

    const { state } = oauthService.createOAuthState("github");
    const result = await oauthService.handleCallback("github", {
      code: "x",
      state,
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

    const { state } = oauthService.createOAuthState("google");
    const result = await oauthService.handleCallback("google", {
      code: "x",
      state,
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

    const { state } = oauthService.createOAuthState("github");
    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "x",
        state,
      }),
      /HTTP 503/
    );
  });

  it("formatAuthResponse acrescenta { sucesso: true }", () => {
    const formatted = oauthService.formatAuthResponse({ token: "t", user: { id: 1 } });
    assert.equal(formatted.sucesso, true);
    assert.equal(formatted.token, "t");
    assert.deepEqual(formatted.user, { id: 1 });
  });

  // Novos testes solicitados pelo usuário
  it("Cenário A (Segurança): falha na validação do parâmetro state", async () => {
    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "fake_code",
        state: "state_invalido_ou_forjado",
      }),
      /state|invali/i // Expressão regular genérica para cobrir "Invalid state" ou falhas relativas ao state
    );
  });

  it("Cenário B (Resiliência): simula erro 500 no token exchange (não deve derrubar o node)", async () => {
    global.fetch = async (url) => {
      if (url.includes("access_token") || url.includes("token")) {
        return { ok: false, status: 500, json: async () => ({ error: "Internal Server Error" }) };
      }
      throw new Error("URL inesperada: " + url);
    };

    const { state: validState } = oauthService.createOAuthState("github");
    
    // O erro deve ser propagado como AppError (ou Error) e não causar crash (uncaughtException)
    await assert.rejects(
      oauthService.handleCallback("github", { code: "fake_code", state: validState }),
      (err) => {
        // Valida que o erro foi capturado e retornado adequadamente (geralmente conterá 500 ou mensagem da API)
        return err.message.includes("500") || err.message.includes("Token") || err.status === 500 || err.statusCode === 500 || err.message.includes("HTTP");
      }
    );
  });

  it("Cenário C (Sucesso E2E Mockado): perfil falso gera JWT correto", async () => {
    restoreOauthRepo = stubRepo(oauthRepository, {
      findByProvider: async () => null,
      linkAccount: async () => ({ id: 99 }),
      findProvidersByUserId: async () => [{ provider: "github" }],
    });
    restoreUserRepo = stubRepo(userRepository, {
      findByEmail: async () => null,
      create: async () => ({ id: 99, name: "Teste E2E", email: "e2e@mock.com" }),
    });

    global.fetch = async (url) => {
      if (url.includes("access_token")) return tokenResponse("fake_access_token_e2e");
      if (url.includes("api.github.com/user")) {
        return {
          ok: true,
          json: async () => ({ id: 1010, login: "e2e_mock", email: "e2e@mock.com" }),
        };
      }
      throw new Error("URL inesperada: " + url);
    };

    const { state: validState } = oauthService.createOAuthState("github");
    const result = await oauthService.handleCallback("github", { code: "valid_code", state: validState });

    assert.equal(result.user.email, "e2e@mock.com");
    
    // Verifica se a função interna gerou o JWT
    assert.ok(result.token, "O JWT deve ter sido gerado na resposta");
    const decoded = verifyToken(result.token);
    assert.equal(decoded.sub, 99);
    assert.equal(decoded.email, "e2e@mock.com");
  });
});
