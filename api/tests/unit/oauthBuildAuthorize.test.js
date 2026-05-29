const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_authorize";

const oauthService = require("../../src/services/oauthService");
const AppError = require("../../src/utils/AppError");

const setProvider = (provider, { id = "client", secret = "secret", callback = "http://localhost/cb" } = {}) => {
  const prefix = provider.toUpperCase();
  process.env[`${prefix}_CLIENT_ID`] = id;
  process.env[`${prefix}_CLIENT_SECRET`] = secret;
  process.env[`${prefix}_CALLBACK_URL`] = callback;
};

const unsetProvider = (provider) => {
  const prefix = provider.toUpperCase();
  delete process.env[`${prefix}_CLIENT_ID`];
  delete process.env[`${prefix}_CLIENT_SECRET`];
  delete process.env[`${prefix}_CALLBACK_URL`];
};

describe("oauthService.buildAuthorizeUrl", () => {
  beforeEach(() => {
    unsetProvider("github");
    unsetProvider("google");
  });

  afterEach(() => {
    unsetProvider("github");
    unsetProvider("google");
  });

  it("rejeita provedor não suportado", () => {
    assert.throws(
      () => oauthService.buildAuthorizeUrl("facebook"),
      (err) => err instanceof AppError && err.status === 400,
    );
  });

  it("rejeita provedor sem credenciais configuradas", () => {
    assert.throws(
      () => oauthService.buildAuthorizeUrl("github"),
      (err) => err instanceof AppError && err.status === 503,
    );
  });

  it("monta URL com state, scope e redirect_uri para GitHub", () => {
    setProvider("github", { id: "gh-id", callback: "http://localhost:3000/auth/oauth/github/callback" });
    const url = new URL(oauthService.buildAuthorizeUrl("github"));

    assert.equal(url.origin + url.pathname, "https://github.com/login/oauth/authorize");
    assert.equal(url.searchParams.get("client_id"), "gh-id");
    assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3000/auth/oauth/github/callback");
    assert.equal(url.searchParams.get("scope"), "read:user user:email");
    assert.ok(url.searchParams.get("state"), "state JWT presente");
  });

  it("adiciona response_type, access_type e prompt para Google", () => {
    setProvider("google", { id: "g-id" });
    const url = new URL(oauthService.buildAuthorizeUrl("google"));

    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("access_type"), "online");
    assert.equal(url.searchParams.get("prompt"), "select_account");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
  });

  it("o state gerado é válido quando verificado para o mesmo provedor", () => {
    setProvider("github");
    const url = new URL(oauthService.buildAuthorizeUrl("github"));
    const state = url.searchParams.get("state");

    const decoded = oauthService.verifyOAuthState(state, "github");
    assert.equal(decoded.provider, "github");
    assert.equal(decoded.purpose, "oauth");
  });

  it("state de um provedor é rejeitado quando verificado para outro", () => {
    setProvider("github");
    const url = new URL(oauthService.buildAuthorizeUrl("github"));
    const state = url.searchParams.get("state");

    assert.throws(
      () => oauthService.verifyOAuthState(state, "google"),
      (err) => err instanceof AppError && err.status === 400,
    );
  });
});
