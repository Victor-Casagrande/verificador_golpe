const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeAnalysisUrl,
  extractSiteHost,
} = require("../../src/utils/urlNormalize");

describe("urlNormalize", () => {
  it("normaliza hostname, barra final e fragmento", () => {
    assert.equal(
      normalizeAnalysisUrl("https://Example.COM/pagina/"),
      "https://example.com/pagina",
    );
    assert.equal(
      normalizeAnalysisUrl("https://example.com/path#section"),
      "https://example.com/path",
    );
  });

  it("preserva a raiz sem remover a barra única", () => {
    assert.equal(
      normalizeAnalysisUrl("https://example.com/"),
      "https://example.com/",
    );
  });

  it("remove portas padrão http e https", () => {
    assert.equal(
      normalizeAnalysisUrl("https://example.com:443/loja"),
      "https://example.com/loja",
    );
    assert.equal(
      normalizeAnalysisUrl("http://example.com:80/loja"),
      "http://example.com/loja",
    );
  });

  it("mantém portas não padrão", () => {
    assert.equal(
      normalizeAnalysisUrl("https://example.com:8443/api"),
      "https://example.com:8443/api",
    );
  });

  it("extractSiteHost usa URL normalizada", () => {
    assert.equal(
      extractSiteHost("https://WWW.Example.COM:443/"),
      "www.example.com",
    );
  });
});
