const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAllowedOrigins,
  isLocalhostOrigin,
  shouldAllowLocalhost,
  createCorsOptions,
} = require("../../src/config/cors");

describe("cors config", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("isLocalhostOrigin aceita localhost e 127.0.0.1 em qualquer porta", () => {
    assert.equal(isLocalhostOrigin("http://localhost:5173"), true);
    assert.equal(isLocalhostOrigin("http://127.0.0.1:3001"), true);
    assert.equal(isLocalhostOrigin("http://example.com"), false);
  });

  it("buildAllowedOrigins inclui FRONTEND_URL e CORS_ALLOWED_ORIGINS", () => {
    process.env.FRONTEND_URL = "https://app.exemplo.com";
    process.env.CORS_ALLOWED_ORIGINS =
      "https://preview.exemplo.com,https://outro.exemplo.com";
    const origins = buildAllowedOrigins();
    assert.ok(origins.has("https://app.exemplo.com"));
    assert.ok(origins.has("https://preview.exemplo.com"));
    assert.ok(origins.has("http://localhost:5173"));
  });

  it("shouldAllowLocalhost respeita CORS_ALLOW_LOCALHOST em produção", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CORS_ALLOW_LOCALHOST;
    assert.equal(shouldAllowLocalhost(), false);

    process.env.CORS_ALLOW_LOCALHOST = "true";
    assert.equal(shouldAllowLocalhost(), true);
  });

  it("createCorsOptions nega origem maliciosa sem lançar erro", () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ALLOW_LOCALHOST = "false";
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.FRONTEND_URL;

    const { origin } = createCorsOptions();

    return new Promise((resolve, reject) => {
      origin("http://site-malicioso.com", (err, allowed) => {
        try {
          assert.equal(err, null);
          assert.equal(allowed, false);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });

  it("createCorsOptions permite 127.0.0.1 quando CORS_ALLOW_LOCALHOST=true", () => {
    process.env.NODE_ENV = "production";
    process.env.CORS_ALLOW_LOCALHOST = "true";

    const { origin } = createCorsOptions();

    return new Promise((resolve, reject) => {
      origin("http://127.0.0.1:5173", (err, allowed) => {
        try {
          assert.equal(err, null);
          assert.equal(allowed, true);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
});
