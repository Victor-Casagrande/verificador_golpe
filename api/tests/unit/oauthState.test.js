process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_oauth_state_secret";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const stubs = require("../helpers/moduleStubs");

const SERVICE_PATH = require.resolve("../../src/services/oauthService");

/**
 * Re-test pontual de createOAuthState/verifyOAuthState (os fluxos
 * end-to-end estão em oauthServiceFlow.test.js).
 *
 * A nova API devolve `{ state, nonce }` em vez de apenas a string,
 * porque o nonce também é enviado na URL de autorização do Google
 * para correlação OpenID Connect.
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
  return {
    sign: (payload, secret) => {
      const body = toB64({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600,
      });
      const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
      return `${body}.${sig}`;
    },
    verify: (token, secret) => {
      const [body, sig] = String(token).split(".");
      if (!body || !sig) throw new Error("malformed");
      const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
      if (expected !== sig) throw new Error("invalid signature");
      return fromB64(body);
    },
  };
};

const loadService = () => {
  stubs.register({
    jsonwebtoken: makeJwtModule(),
    dotenv: { config: () => {} },
    pg: {
      Pool: function () {
        return { query: async () => ({ rows: [] }), on: () => {}, connect: () => {} };
      },
    },
  });
  stubs.clearRequireCacheFor(SERVICE_PATH);
  return require("../../src/services/oauthService");
};

describe("oauthService state", () => {
  beforeEach(() => stubs.clearRequireCacheFor(SERVICE_PATH));
  afterEach(() => stubs.restore());

  it("gera e valida state para o provedor correto", () => {
    const { createOAuthState, verifyOAuthState } = loadService();
    const { state, nonce } = createOAuthState("github");
    const decoded = verifyOAuthState(state, "github");
    assert.equal(decoded.provider, "github");
    assert.equal(decoded.purpose, "oauth");
    assert.equal(decoded.nonce, nonce);
  });

  it("rejeita state de outro provedor", () => {
    const { createOAuthState, verifyOAuthState } = loadService();
    const { state } = createOAuthState("google");
    assert.throws(() => verifyOAuthState(state, "github"));
  });
});
