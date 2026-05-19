const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { checkStaticHeuristics } = require('../../src/utils/urlHeuristics');
const fixtures = require('../fixtures/test-urls.json');

describe('urlHeuristics', () => {
  it('marca URLs seguras como não perigosas', () => {
    for (const url of fixtures.safe) {
      const result = checkStaticHeuristics(url);
      assert.equal(result.is_danger, false, `esperado seguro: ${url}`);
      assert.equal(result.status, 'Seguro');
    }
  });

  it('detecta padrões suspeitos nas heurísticas locais', () => {
    for (const url of fixtures.heuristic_suspicious) {
      const result = checkStaticHeuristics(url);
      assert.equal(result.is_danger, true, `esperado suspeito: ${url}`);
      assert.equal(result.status, 'Aparência Suspeita (Heurística)');
    }
  });

  it('rejeita strings que não são URLs válidas', () => {
    const result = checkStaticHeuristics('not-a-url');
    assert.equal(result.is_danger, true);
    assert.equal(result.status, 'Erro de Formato');
  });

  it('URLs com hostname válido mas protocolo ftp passam na heurística estrutural', () => {
    const result = checkStaticHeuristics('ftp://arquivos.local/file');
    assert.equal(result.is_danger, false);
    assert.equal(result.status, 'Seguro');
  });
});
