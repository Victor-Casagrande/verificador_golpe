const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_exchange";
process.env.GITHUB_CLIENT_ID = "gh-id";
process.env.GITHUB_CLIENT_SECRET = "gh-secret";
process.env.GITHUB_CALLBACK_URL = "http://localhost:3000/auth/oauth/github/callback";

const oauthService = require("../../src/services/oauthService");
const AppError = require("../../src/utils/AppError");

const fakeFetchResponse = ({ ok = true, status = 200, json = {}, throwOnJson = false } = {}) => ({
  ok,
  status,
  json: async () => {
    if (throwOnJson) throw new Error("invalid json");
    return json;
  },
});

describe("oauthService.exchangeCodeForToken (via handleCallback wiring)", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("propaga AppError 502 quando o provedor responde HTTP de erro", async () => {
    global.fetch = async () => fakeFetchResponse({ ok: false, status: 401 });

    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "any",
        state: oauthService.createOAuthState("github"),
      }),
      (err) => err instanceof AppError && err.status === 502,
    );
  });

  it("propaga AppError 502 em falha de rede", async () => {
    global.fetch = async () => {
      throw new Error("ECONNREFUSED");
    };

    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "any",
        state: oauthService.createOAuthState("github"),
      }),
      (err) => err instanceof AppError && err.status === 502,
    );
  });

  it("propaga AppError 502 quando o provedor retorna JSON inválido", async () => {
    global.fetch = async () => fakeFetchResponse({ throwOnJson: true });

    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "any",
        state: oauthService.createOAuthState("github"),
      }),
      (err) => err instanceof AppError && err.status === 502,
    );
  });

  it("propaga AppError 502 quando body inclui campo error", async () => {
    global.fetch = async () =>
      fakeFetchResponse({
        json: { error: "bad_verification_code", error_description: "code expirou" },
      });

    await assert.rejects(
      oauthService.handleCallback("github", {
        code: "any",
        state: oauthService.createOAuthState("github"),
      }),
      (err) => err instanceof AppError && /code expirou/i.test(err.message),
    );
  });

  it("rejeita callback sem code", async () => {
    await assert.rejects(
      oauthService.handleCallback("github", {
        code: undefined,
        state: oauthService.createOAuthState("github"),
      }),
      (err) => err instanceof AppError && err.status === 400,
    );
  });

  it("rejeita callback com state inválido", async () => {
    await assert.rejects(
      oauthService.handleCallback("github", { code: "x", state: "lixo" }),
      (err) => err instanceof AppError && err.status === 400,
    );
  });
});
