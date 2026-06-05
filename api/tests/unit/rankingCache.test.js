const { describe, it, mock, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');
const reportRepository = require('../../src/repositories/reportRepository');
const { rankingCache } = require('../../src/controllers/reportController');

describe('Ranking Cache & Thundering Herd Mitigation', () => {
  beforeEach(() => {
    rankingCache.flushAll();
  });

  afterEach(() => {
    mock.restoreAll();
    rankingCache.flushAll();
  });

  it('Cenário de Pico de Tráfego: Aciona o banco apenas uma vez para 50 requisições simultâneas', async () => {
    // 1. Faz o Mock (Spy) do repositório
    const repoSpy = mock.method(reportRepository, 'findReportStatsByUrl', async () => {
      // Simula lentidão do banco de dados para garantir concorrência
      await new Promise(resolve => setTimeout(resolve, 50));
      return [{ url: 'http://malicioso.com', report_count: 100 }];
    });

    // 2. Simula um pico de acesso (50 requisições simultâneas)
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(request(app).get('/rankings/reports/most?limit=10'));
    }

    const responses = await Promise.all(promises);

    // 3. Valida os retornos
    for (const res of responses) {
      assert.equal(res.status, 200);
      assert.equal(res.body.sucesso, true);
      assert.equal(res.body.rankings[0].url, 'http://malicioso.com');
    }

    // 4. Validação matemática do throughput e blindagem do banco
    assert.equal(
      repoSpy.mock.callCount(),
      1,
      'A função espiã do banco de dados deveria ter sido acionada exatamente 1 ÚNICA VEZ'
    );
  });
});
