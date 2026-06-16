/**
 * @openapi
 * /urls/analyze:
 *   post:
 *     tags: [Verificação]
 *     summary: Analisa URL (Google Safe Browsing + axe-core no servidor)
 *     description: |
 *       Fluxo: (1) verificação de segurança Google/heurísticas; (2) auditoria axe-core via Puppeteer;
 *       (3) gera accessibility_score (penalidade) e quality_rating (0–100, maior = melhor).
 *       A nota usa pesos por impacto (critical 10 / serious 5 / moderate 2 / minor 1),
 *       retornos decrescentes por nós (1 + log2(nós), com teto), curva exponencial
 *       (100·e^(-penalidade/150)) e amortecimento por cobertura via `passes_count` —
 *       evitando zerar sites grandes e, no geral, razoáveis.
 *       Com `dev_mode: true`, a resposta inclui `accessibility.detailed_report` com exceções
 *       completas do axe-core (tags, nós afetados, HTML e failureSummary) para depuração.
 *       Cada chamada grava nova análise — o mesmo site em datas diferentes pode ter notas diferentes.
 *       Header Authorization opcional vincula ao histórico do usuário.
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UrlAnalyzeRequest'
 *     responses:
 *       200:
 *         description: Resultado da análise
 *       400:
 *         description: URL inválida
 *
 * /users/history:
 *   get:
 *     tags: [Histórico]
 *     summary: Histórico de análises do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista paginada
 *       401:
 *         description: Não autenticado
 *
 * /reports:
 *   post:
 *     tags: [Denúncias]
 *     summary: Enviar feedback/denúncia sobre uma URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportRequest'
 *     responses:
 *       201:
 *         description: Denúncia registrada
 *       401:
 *         description: Não autenticado
 *
 * /reports/mine:
 *   get:
 *     tags: [Denúncias]
 *     summary: Lista paginada das denúncias do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista paginada das denúncias do usuário
 *       401:
 *         description: Não autenticado
 *
 * /urls/scores/history:
 *   get:
 *     tags: [Histórico]
 *     summary: Evolução das notas de uma URL ao longo do tempo
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema: { type: string, format: uri }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Timeline de quality_rating por data
 *
 * /rankings/accessibility/worst:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites com piores notas (menor quality_rating médio)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: min_analyses
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Ranking dos piores por host
 *
 * /rankings/accessibility/best:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites com melhores notas (maior quality_rating médio)
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Ranking dos melhores por host
 *
 * /rankings/reports/most:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites com mais denúncias dos usuários
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Ranking por quantidade de reports
 */

module.exports = {};
