const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const fetchGithubProfile = require("../../src/oauth/fetchGithubProfile");
const fetchGoogleProfile = require("../../src/oauth/fetchGoogleProfile");

const okResponse = (body) => ({ ok: true, json: async () => body });
const failResponse = (status = 401) => ({ ok: false, status, json: async () => ({}) });

describe("fetchGithubProfile", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retorna perfil quando /user inclui email", async () => {
    global.fetch = async (url) => {
      assert.equal(url, "https://api.github.com/user");
      return okResponse({ id: 99, login: "vitor", name: "Vitor", email: "Vitor@Foo.com" });
    };

    const profile = await fetchGithubProfile("tok");
    assert.equal(profile.providerUserId, "99");
    assert.equal(profile.email, "vitor@foo.com", "email é normalizado em lowercase");
    assert.equal(profile.name, "Vitor");
  });

  it("consulta /user/emails quando /user vem sem email", async () => {
    const calls = [];
    global.fetch = async (url) => {
      calls.push(url);
      if (url === "https://api.github.com/user") {
        return okResponse({ id: 7, login: "ana", name: "Ana" });
      }
      if (url === "https://api.github.com/user/emails") {
        return okResponse([
          { email: "secundario@foo.com", primary: false, verified: true },
          { email: "ana@foo.com", primary: true, verified: true },
        ]);
      }
      throw new Error(`URL inesperada: ${url}`);
    };

    const profile = await fetchGithubProfile("tok");
    assert.equal(profile.email, "ana@foo.com", "deve preferir primary+verified");
    assert.deepEqual(calls, [
      "https://api.github.com/user",
      "https://api.github.com/user/emails",
    ]);
  });

  it("usa fallback login quando name está vazio", async () => {
    global.fetch = async (url) => {
      if (url === "https://api.github.com/user") {
        return okResponse({ id: 1, login: "anon", email: "anon@foo.com" });
      }
      throw new Error("inesperado");
    };
    const profile = await fetchGithubProfile("tok");
    assert.equal(profile.name, "anon");
  });

  it("lança erro se /user falhar", async () => {
    global.fetch = async () => failResponse(401);
    await assert.rejects(fetchGithubProfile("tok"), /HTTP 401/);
  });

  it("lança erro se não houver nenhum email", async () => {
    global.fetch = async (url) => {
      if (url === "https://api.github.com/user") return okResponse({ id: 1, login: "x" });
      if (url === "https://api.github.com/user/emails") return okResponse([]);
      throw new Error("inesperado");
    };
    await assert.rejects(fetchGithubProfile("tok"), /não retornou e-mail/i);
  });
});

describe("fetchGoogleProfile", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retorna perfil quando email está verificado", async () => {
    global.fetch = async (url) => {
      assert.equal(url, "https://www.googleapis.com/oauth2/v2/userinfo");
      return okResponse({
        id: "g-123",
        email: "Joao@Gmail.Com",
        verified_email: true,
        name: "João",
      });
    };

    const profile = await fetchGoogleProfile("tok");
    assert.equal(profile.providerUserId, "g-123");
    assert.equal(profile.email, "joao@gmail.com");
    assert.equal(profile.name, "João");
  });

  it("recusa email não verificado", async () => {
    global.fetch = async () =>
      okResponse({ id: "1", email: "x@y.com", verified_email: false });

    await assert.rejects(fetchGoogleProfile("tok"), /e-mail verificado/i);
  });

  it("recusa quando email está ausente", async () => {
    global.fetch = async () => okResponse({ id: "1", verified_email: true });
    await assert.rejects(fetchGoogleProfile("tok"), /e-mail verificado/i);
  });

  it("lança erro em HTTP de erro", async () => {
    global.fetch = async () => failResponse(403);
    await assert.rejects(fetchGoogleProfile("tok"), /HTTP 403/);
  });
});
