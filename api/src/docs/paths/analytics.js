/**
 * @openapi
 * /:
 *   get:
 *     tags: [Sistema]
 *     summary: Índice da API
 *     description: Página de boas-vindas com links HATEOAS para os principais endpoints.
 *     responses:
 *       200:
 *         description: Mapa de rotas disponíveis
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
 *     summary: Panorama geral de segurança
 *     description: |
 *       Volumetria agregada de todas as análises: total de ameaças, URLs seguras,
 *       detecções por Google vs. heurísticas e hits de cache.
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
 *                     total_analyses: { type: integer, description: "Total de URLs analisadas" }
 *                     total_threats: { type: integer, description: "URLs classificadas como perigosas" }
 *                     total_safe: { type: integer }
 *                     threats_caught_by_google: { type: integer }
 *                     threats_caught_by_heuristics: { type: integer }
 *                     total_cache_hits: { type: integer, description: "Análises atendidas pelo cache de 24 h" }
 *                 timestamp: { type: string, format: date-time }
 *       401:
 *         description: Token ausente ou inválido
 *
 * /api/analytics/security/community:
 *   get:
 *     tags: [Analytics]
 *     summary: Denúncias da comunidade
 *     description: |
 *       Agrega denúncias enviadas pelos usuários, cruzando com a origem da análise
 *       (Google Safe Browsing ou heurísticas) para cada tipo de report.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Denúncias agrupadas por tipo
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
 *         description: Token ausente ou inválido
 *
 * /api/analytics/security/ranking/hosts:
 *   get:
 *     tags: [Analytics]
 *     summary: Hosts mais perigosos
 *     description: Ranking de domínios com maior volume de ameaças detectadas.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 50 }
 *     responses:
 *       200:
 *         description: Top N hosts por ameaças detectadas
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
 *       401:
 *         description: Token ausente ou inválido
 *
 * /api/analytics/accessibility/global:
 *   get:
 *     tags: [Analytics]
 *     summary: Panorama geral de acessibilidade
 *     description: |
 *       Médias globais de `quality_rating` e `accessibility_score`,
 *       total de auditorias e distribuição por origem (`server`, `client`, `skipped`).
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
 *                     avg_quality_rating: { type: number, format: float, description: "Média da nota (maior = melhor)" }
 *                     avg_accessibility_score: { type: number, format: float, description: "Média da penalidade (maior = pior)" }
 *                     execution_sources:
 *                       type: object
 *                       description: "Quantidade de auditorias por origem"
 *                       properties:
 *                         server: { type: integer }
 *                         client: { type: integer }
 *                         skipped: { type: integer }
 *       401:
 *         description: Token ausente ou inválido
 *
 * /api/analytics/accessibility/ranking/hosts:
 *   get:
 *     tags: [Analytics]
 *     summary: Hosts com pior acessibilidade
 *     description: Ranking de domínios com menor `quality_rating` médio entre todas as auditorias.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 50 }
 *     responses:
 *       200:
 *         description: Top N hosts com pior nota média
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
 *       401:
 *         description: Token ausente ou inválido
 */

module.exports = {};
