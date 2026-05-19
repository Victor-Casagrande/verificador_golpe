#!/usr/bin/env node
/**
 * Script para testar verificação de URLs contra a API local.
 * Uso: node scripts/test-urls-local.js
 *
 * Requer API em execução (npm run dev ou docker compose up).
 */
const fs = require('fs');
const path = require('path');

// URL base fixa da API
const baseUrl = 'http://localhost:3000';

const fixturesPath = path.join(__dirname, '../tests/fixtures/test-urls.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

const analyzeUrl = async (url, accessibilityReport = []) => {
  const res = await fetch(`${baseUrl}/urls/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      accessibility_report: accessibilityReport
    })
  });

  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

const runGroup = async (label, urls, extra = {}) => {
  console.log(`\n=== ${label} ===`);

  for (const url of urls) {
    const { status, body } = await analyzeUrl(
      url,
      extra.accessibility_report
    );

    const security = body.security || {};
    const icon = security.is_danger ? '⚠️' : '✅';

    console.log(
      `${icon} [${status}] ${url}\n` +
      `    status: ${security.status || body.error?.message || '—'}\n` +
      `    cached: ${body.cached ?? '—'} | score: ${body.accessibility?.accessibility_score ?? '—'}`
    );
  }
};

const main = async () => {
  console.log(`Sentinela — teste local de URLs\nAPI: ${baseUrl}`);

  try {
    const health = await fetch(`${baseUrl}/api/status`);

    if (!health.ok) {
      console.error(
        'API não respondeu ao health check. Suba o servidor antes de rodar este script.'
      );
      process.exit(1);
    }
  } catch {
    console.error(
      `Não foi possível conectar em ${baseUrl}. Execute: npm run dev`
    );
    process.exit(1);
  }

  await runGroup(
    'URLs seguras (esperado: Seguro)',
    fixtures.safe
  );

  await runGroup(
    'URLs suspeitas — heurística local',
    fixtures.heuristic_suspicious
  );

  await runGroup(
    'URLs inválidas',
    fixtures.invalid
  );

  await runGroup(
    'Com relatório de acessibilidade (fixture)',
    [fixtures.safe[0]],
    {
      accessibility_report:
        fixtures.sample_accessibility_violations
    }
  );

  console.log('\nConcluído.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});