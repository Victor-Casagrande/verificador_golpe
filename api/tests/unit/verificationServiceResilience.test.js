process.env.NODE_ENV = "test";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

/**
 * Testes de resiliência do verificationService a falhas do PostgreSQL.
 *
 * Cenários cobertos:
 *   1. A consulta de cache lançar NUNCA aborta a análise (retorna null).
 *   2. O INSERT falhar produz `persistence.persisted: false` com mensagem clara.
 *   3. O alerta de segurança (is_danger) chega íntegro ao cliente mesmo com
 *      o banco completamente fora do ar.
 *
 * Como rodar em ambientes sem node_modules: o teste stub-a o `axeService`
 * inteiro e o `historyRepository` via `require.cache`, evitando carregar
 * puppeteer-core / pg / @axe-core/puppeteer.
 */

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

const axeServiceStub = {
  auditUrl: async (_url, { devMode } = {}) => ({
    violations: [],
    detailedViolations: devMode ? [] : undefined,
    source: "skipped",
    error: null,
  }),
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

const makeRepoMock = ({ findThrows = false, saveThrows = false } = {}) => ({
  findCachedSecurityByUrl: async () => {
    if (findThrows) throw new Error("ECONNREFUSED: Postgres fora do ar");
    return null;
  },
  findCachedAccessibilityByUrl: async () => {
    if (findThrows) throw new Error("ECONNREFUSED: Postgres fora do ar");
    return null;
  },
  saveAnalysis: async () => {
    if (saveThrows) throw new Error("ECONNREFUSED: Postgres fora do ar");
    return { id: 42 };
  },
});

const loadServiceWithMocks = (repoMock) => {
  delete require.cache[SERVICE_PATH];
  installStub(AXE_PATH, axeServiceStub);
  installStub(REPO_PATH, repoMock);
  installStub(LOGGER_PATH, loggerStub);
  return require("../../src/services/verificationService");
};

describe("verificationService — resiliência ao banco de dados", () => {
  beforeEach(() => {
    delete require.cache[SERVICE_PATH];
    delete require.cache[REPO_PATH];
    delete require.cache[AXE_PATH];
    delete require.cache[LOGGER_PATH];
  });

  it("tryFindCachedSecurity devolve null quando o repositório lança (DB fora)", async () => {
    const service = loadServiceWithMocks(makeRepoMock({ findThrows: true }));
    const result = await service.tryFindCachedSecurity("https://exemplo.com");
    assert.equal(result, null);
  });

  it("persistAnalysis retorna persisted:true quando o INSERT funciona", async () => {
    const service = loadServiceWithMocks(makeRepoMock());
    const { analysisId, persistence } = await service.persistAnalysis({
      url: "https://exemplo.com",
      siteHost: "exemplo.com",
    });
    assert.equal(analysisId, 42);
    assert.equal(persistence.persisted, true);
    assert.equal(persistence.error, null);
  });

  it("persistAnalysis retorna persisted:false e mensagem amigável quando o INSERT falha", async () => {
    const service = loadServiceWithMocks(makeRepoMock({ saveThrows: true }));
    const { analysisId, persistence } = await service.persistAnalysis({
      url: "https://exemplo.com",
      siteHost: "exemplo.com",
    });
    assert.equal(analysisId, null);
    assert.equal(persistence.persisted, false);
    assert.ok(persistence.error.includes("banco de dados indisponível"));
  });

  it("verifyUrl conclui com is_danger correto mesmo com banco totalmente fora", async () => {
    const service = loadServiceWithMocks(
      makeRepoMock({ findThrows: true, saveThrows: true }),
    );
    const response = await service.verifyUrl(
      "https://192.168.0.1/login",
      [],
      null,
      false,
    );

    assert.equal(response.analysis_id, null);
    assert.equal(response.persistence.persisted, false);
    assert.equal(response.security.is_danger, true);
    assert.ok(response.security.status.includes("Heurística"));
    assert.equal(typeof response.accessibility.quality_rating, "number");
  });
});
