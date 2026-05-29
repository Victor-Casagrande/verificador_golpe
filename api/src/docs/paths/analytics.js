/**
 * @openapi
 * /:
 *   get:
 *     tags: [Sistema]
 *     summary: Index da API (HATEOAS — lista de endpoints)
 *     responses:
 *       200:
 *         description: Bem-vindo e mapa de rotas principais
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sucesso: { type: boolean }
 *                 mensagem: { type: string }
 *                 versao: { type: string }
 *                 links:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       href: { type: string }
 *                       method: { type: string }
 *
 * /api/analytics/security/global:
 *   get:
 *     tags: [Analytics]
 *     summary: Volumetria geral de fraudes (ameaças, seguros, cache hits)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas globais de segurança
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_analyses: { type: integer }
 *                     total_threats: { type: integer }
 *                     total_safe: { type: integer }
 *                     threats_caught_by_google: { type: integer }
 *                     threats_caught_by_heuristics: { type: integer }
 *                     total_cache_hits: { type: integer }
 *                 timestamp: { type: string, format: date-time }
 *       401:
 *         description: Não autenticado
 *
 * /api/analytics/security/community:
 *   get:
 *     tags: [Analytics]
 *     summary: Feedbacks da comunidade cruzados com origem da análise
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista agrupada por report_type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       report_type: { type: string }
 *                       total_reports: { type: integer }
 *                       related_to_heuristics: { type: integer }
 *                       related_to_google: { type: integer }
 *       401:
 *         description: Não autenticado
 *
 * /api/analytics/security/ranking/hosts:
 *   get:
 *     tags: [Analytics]
 *     summary: Ranking de domínios mais perigosos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1 }
 *     responses:
 *       200:
 *         description: Top N hosts com mais ameaças detectadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       site_host: { type: string }
 *                       threat_count: { type: integer }
 *                       last_threat_seen: { type: string, format: date-time }
 *       400:
 *         description: Parâmetro limit inválido
 *       401:
 *         description: Não autenticado
 *
 * /api/analytics/accessibility/global:
 *   get:
 *     tags: [Analytics]
 *     summary: Médias globais de quality_rating e accessibility_score
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas globais de acessibilidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_audits: { type: integer }
 *                     avg_quality_rating: { type: number, format: float }
 *                     avg_accessibility_score: { type: number, format: float }
 *                     execution_sources:
 *                       type: object
 *                       properties:
 *                         server: { type: integer }
 *                         client: { type: integer }
 *                         skipped: { type: integer }
 *       401:
 *         description: Não autenticado
 *
 * /api/analytics/accessibility/ranking/hosts:
 *   get:
 *     tags: [Analytics]
 *     summary: Ranking de domínios com pior acessibilidade média
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1 }
 *     responses:
 *       200:
 *         description: Top N hosts com pior quality_rating médio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       site_host: { type: string }
 *                       pages_audited: { type: integer }
 *                       avg_quality_rating: { type: number, format: float }
 *                       avg_penalty_score: { type: number, format: float }
 *       400:
 *         description: Parâmetro limit inválido
 *       401:
 *         description: Não autenticado
 */

module.exports = {};
