/**
 * @openapi
 * /urls/analyze:
 *   post:
 *     tags: [Verificação]
 *     summary: Analisa segurança e acessibilidade de uma URL
 *     description: |
 *       Executa a análise completa de uma URL:
 *
 *       **Segurança** — cache de 24 h → Google Safe Browsing → heurísticas locais (7 regras).
 *
 *       **Acessibilidade** — auditoria axe-core no servidor (Chromium headless).
 *       Retorna `quality_rating` (0–100, maior = melhor) e `accessibility_score` (penalidade).
 *
 *       - Autenticação **opcional** — com JWT, a análise é vinculada ao histórico do usuário.
 *       - Se o banco estiver indisponível, a análise continua; `persistence.persisted` será `false`.
 *       - `accessibility_report` no body serve como fallback quando a auditoria no servidor falha.
 *       - Cada chamada gera um novo registro — o mesmo site pode ter notas diferentes ao longo do tempo.
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
 *         description: Análise concluída
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UrlAnalyzeResponse'
 *       400:
 *         description: URL inválida ou ausente
 *
 * /users/history:
 *   get:
 *     tags: [Histórico]
 *     summary: Histórico de análises do usuário
 *     description: Lista paginada das URLs analisadas pelo usuário autenticado, com veredito de segurança e nota de acessibilidade.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *         description: Quantidade de registros por página
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *         description: Deslocamento para paginação
 *       - in: query
 *         name: url
 *         schema: { type: string, format: uri }
 *         description: Filtrar por URL específica
 *     responses:
 *       200:
 *         description: Lista paginada de análises
 *       401:
 *         description: Token ausente ou inválido
 *
 * /reports:
 *   post:
 *     tags: [Denúncias]
 *     summary: Registrar denúncia ou feedback sobre uma URL
 *     description: |
 *       Permite que usuários autenticados reportem URLs analisadas.
 *       Tipos: `false_positive` (falso positivo), `confirmed_scam` (golpe confirmado),
 *       `accessibility_issue` (problema de acessibilidade), `other`.
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
 *         description: Token ausente ou inválido
 *       429:
 *         description: Limite de denúncias por IP excedido
 *
 * /reports/mine:
 *   get:
 *     tags: [Denúncias]
 *     summary: Denúncias enviadas pelo usuário
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
 *         description: Lista paginada de denúncias do usuário
 *       401:
 *         description: Token ausente ou inválido
 *
 * /urls/scores/history:
 *   get:
 *     tags: [Histórico]
 *     summary: Evolução das notas de uma URL
 *     description: Timeline pública das análises de acessibilidade de uma URL específica, ordenada da mais recente para a mais antiga.
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema: { type: string, format: uri }
 *         description: URL cuja timeline será consultada
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30, maximum: 100 }
 *     responses:
 *       200:
 *         description: Timeline de notas com data, `quality_rating` e `accessibility_score`
 *       400:
 *         description: Parâmetro `url` ausente ou inválido
 *
 * /rankings/accessibility/worst:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites com piores notas de acessibilidade
 *     description: Ranking público de hosts com menor `quality_rating` médio. Requer ao menos `min_analyses` auditorias por host.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: min_analyses
 *         schema: { type: integer, default: 1 }
 *         description: Mínimo de análises por host para entrar no ranking
 *     responses:
 *       200:
 *         description: Ranking dos piores hosts por nota média
 *
 * /rankings/accessibility/best:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites com melhores notas de acessibilidade
 *     description: Ranking público de hosts com maior `quality_rating` médio.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Ranking dos melhores hosts por nota média
 *
 * /rankings/reports/most:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites mais denunciados
 *     description: Ranking público de URLs/hosts com maior volume de denúncias da comunidade.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Ranking por quantidade de denúncias
 */

module.exports = {};
