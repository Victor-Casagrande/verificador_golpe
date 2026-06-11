/**
 * Endpoints de denúncias.
 */
import { get, post } from "./client.js";

export const REPORT_TYPES = [
  { value: "false_positive", label: "Alerta incorreto (falso positivo)" },
  { value: "confirmed_scam", label: "Confirmo que é golpe" },
  { value: "accessibility_issue", label: "Problema de acessibilidade" },
  { value: "other", label: "Outro motivo" },
];

export const createReport = ({ url, analysisId, reportType, comment }) =>
  post(
    "/reports",
    {
      url,
      analysis_id: analysisId,
      report_type: reportType,
      comment,
    },
    { auth: true },
  );

/**
 * GET /reports/mine — denúncias enviadas pelo usuário autenticado (paginado).
 */
export const getMyReports = ({ limit = 20, offset = 0 } = {}) => {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return get(`/reports/mine?${params.toString()}`, { auth: true });
};
