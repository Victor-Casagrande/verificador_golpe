/**
 * Endpoints de análise de URLs.
 */
import { get, post } from "./client.js";

/**
 * POST /urls/analyze — fluxo completo (segurança + acessibilidade).
 * Header de autorização é opcional: quando enviado, vincula ao histórico
 * do usuário logado.
 */
export const analyzeUrl = ({ url, accessibilityReport = [], devMode = false } = {}) =>
  post(
    "/urls/analyze",
    {
      url,
      accessibility_report: accessibilityReport,
      dev_mode: devMode,
    },
    { auth: true },
  );

/**
 * GET /urls/scores/history?url=...
 * Timeline pública de notas de uma URL ao longo do tempo.
 */
export const getUrlScoreTimeline = ({ url, limit = 30 } = {}) => {
  const params = new URLSearchParams({ url });
  if (limit) params.set("limit", String(limit));
  return get(`/urls/scores/history?${params.toString()}`);
};
