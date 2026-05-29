const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const {
  SUPPORTED_PROVIDERS,
  providerConfig,
  getProviderEnv,
  isProviderConfigured,
  getConfiguredProviders,
} = require("../../src/config/oauthProviders");

const ENV_KEYS = [
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_CALLBACK_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
];

const snapshot = () => Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const restore = (snap) => {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
};

describe("oauthProviders config", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = snapshot();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restore(originalEnv);
  });

  it("expõe github e google como provedores suportados", () => {
    assert.deepEqual(SUPPORTED_PROVIDERS, ["github", "google"]);
    assert.ok(providerConfig.github.authorizeUrl.startsWith("https://github.com"));
    assert.ok(providerConfig.google.authorizeUrl.startsWith("https://accounts.google.com"));
  });

  it("isProviderConfigured exige id, secret e callback", () => {
    assert.equal(isProviderConfigured("github"), false);

    process.env.GITHUB_CLIENT_ID = "x";
    process.env.GITHUB_CLIENT_SECRET = "y";
    assert.equal(isProviderConfigured("github"), false, "sem callback ainda falso");

    process.env.GITHUB_CALLBACK_URL = "http://localhost/cb";
    assert.equal(isProviderConfigured("github"), true);
  });

  it("getConfiguredProviders retorna apenas os configurados", () => {
    assert.deepEqual(getConfiguredProviders(), []);

    process.env.GOOGLE_CLIENT_ID = "g";
    process.env.GOOGLE_CLIENT_SECRET = "s";
    process.env.GOOGLE_CALLBACK_URL = "http://localhost/g";

    const list = getConfiguredProviders();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "google");
    assert.equal(list[0].authorize_path, "/auth/oauth/google");
  });

  it("getProviderEnv lê variáveis com o prefixo correto", () => {
    process.env.GITHUB_CLIENT_ID = "abc";
    const env = getProviderEnv("github");
    assert.equal(env.clientId, "abc");
    assert.equal(env.clientSecret, undefined);
  });
});
