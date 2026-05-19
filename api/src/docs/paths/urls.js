/**
 * @openapi
 * /urls/analyze:
 *   post:
 *     tags: [Verificação]
 *     summary: Analisa URL (Google Safe Browsing + heurísticas locais)
 *     description: |
 *       Envie o header Authorization opcional para vincular ao histórico do usuário.
 *       Sem API key do Google, o motor local (heurísticas) é usado como fallback.
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
 * /rankings/accessibility/worst:
 *   get:
 *     tags: [Rankings]
 *     summary: Sites com piores pontuações de acessibilidade
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Ranking ordenado (maior score = pior)
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
