process.env.NODE_ENV = "test";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const REPO_PATH = require.resolve("../../src/repositories/historyRepository");
const AXE_PATH = require.resolve("../../src/services/axeService");
const LOGGER_PATH = require.resolve("../../src/utils/logger");
const SERVICE_PATH = require.resolve(
  "../../src/services/verificationService",
);

const loggerStub = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

let axeAuditCalls = 0;

const axeServiceStub = {
  auditUrl: async () => {
    axeAuditCalls += 1;
    return {
      violations: [{ id: "color-contrast", impact: "serious" }],
      passes_count: 12,
      source: "server",
      error: null,
    };
  },
  closeBrowser: async () => {},
  isAxeEnabled: () => false,
  sanitizeViolations: (v) => v || [],
  formatDetailedViolations: () => [],
};

const installStub = (modulePath, exports) => {
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
};

const loadServiceWithRepo = (repoMock) => {
  delete require.cache[SERVICE_PATH];
  installStub(AXE_PATH, axeServiceStub);
  installStub(REPO_PATH, repoMock);
  installStub(LOGGER_PATH, loggerStub);
  return require("../../src/services/verificationService");
};

describe("verificationService — cache e normalização", () => {
  beforeEach(() => {
    axeAuditCalls = 0;
    delete require.cache[SERVICE_PATH];
    delete require.cache[REPO_PATH];
    delete require.cache[AXE_PATH];
    delete require.cache[LOGGER_PATH];
    delete process.env.GOOGLE_API_KEY;
  });

  it("reutiliza cache de acessibilidade e não chama o axe", async () => {
    const service = loadServiceWithRepo({
      findCachedSecurityByUrl: async () => null,
      findCachedAccessibilityByUrl: async () => ({
        accessibility_violations: [{ id: "image-alt", impact: "critical" }],
        accessibility_score: 10,
        quality_rating: 72,
        axe_source: "server",
      }),
      saveAnalysis: async () => ({ id: 7 }),
    });

    const response = await service.verifyUrl(
      "https://Example.COM/pagina/",
      [],
      null,
      false,
    );

    assert.equal(axeAuditCalls, 0);
    assert.equal(response.accessibility.from_cache, true);
    assert.equal(response.accessibility.quality_rating, 72);
    assert.equal(response.accessibility.violations_count, 1);
  });

  it("ignora cache de acessibilidade em devMode", async () => {
    const service = loadServiceWithRepo({
      findCachedSecurityByUrl: async () => null,
      findCachedAccessibilityByUrl: async () => ({
        accessibility_violations: [],
        accessibility_score: 0,
        quality_rating: 100,
        axe_source: "server",
      }),
      saveAnalysis: async () => ({ id: 8 }),
    });

    await service.verifyUrl("https://example.com", [], null, true);

    assert.equal(axeAuditCalls, 1);
  });

  it("normaliza URL antes de persistir", async () => {
    let savedUrl = null;
    const service = loadServiceWithRepo({
      findCachedSecurityByUrl: async () => null,
      findCachedAccessibilityByUrl: async () => null,
      saveAnalysis: async (payload) => {
        savedUrl = payload.url;
        return { id: 9 };
      },
    });

    await service.verifyUrl("https://WWW.Example.COM:443/loja/", [], null, false);

    assert.equal(savedUrl, "https://www.example.com/loja");
  });
});
