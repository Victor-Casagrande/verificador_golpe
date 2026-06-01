/**
 * POST /reports — envia uma denúncia de uma análise.
 */
import { post } from "./client.js";

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
