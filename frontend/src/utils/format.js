/**
 * Helpers de formatação e de "tom" (cor semântica) compartilhados pelo
 * dashboard. Mantidos aqui para que badges, tabelas e cards exibam números,
 * datas e veredictos de forma consistente.
 */

/** Formata uma data ISO no padrão pt-BR curto (dd/mm/aaaa hh:mm). */
export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Apenas a data (sem hora). */
export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/** Converte qualquer valor numérico "sujo" (string do Postgres) em Number. */
export const toNumber = (value, fallback = 0) => {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Tom da nota de qualidade de acessibilidade (0–100, maior = melhor).
 *   good  → >= 80
 *   warn  → 50–79
 *   bad   → < 50
 */
export const ratingTone = (rating) => {
  const n = toNumber(rating, 0);
  if (n >= 80) return "good";
  if (n >= 50) return "warn";
  return "bad";
};

/** Tom do veredicto de segurança a partir do flag is_danger. */
export const securityTone = (isDanger) => (isDanger ? "bad" : "good");

/** Tom e rótulo do impacto axe-core (pesos da pontuação). */
export const IMPACT_LABELS = {
  critical: "Crítico",
  serious: "Grave",
  moderate: "Moderado",
  minor: "Leve",
};

export const impactTone = (impact) => {
  const tones = {
    critical: "critical",
    serious: "serious",
    moderate: "moderate",
    minor: "minor",
  };
  return tones[impact] || "neutral";
};

export const impactLabel = (impact) => IMPACT_LABELS[impact] || impact || "n/d";

/** Encurta uma URL longa para exibição (mantém host + início do path). */
export const shortenUrl = (url, max = 48) => {
  if (!url) return "—";
  let display = url.replace(/^https?:\/\//i, "");
  if (display.length > max) display = `${display.slice(0, max - 1)}…`;
  return display;
};

/** Primeira letra utilizável de um usuário (para o avatar). */
export const userInitial = (user) => {
  const base = user?.name || user?.email || "?";
  return base.trim().charAt(0).toUpperCase() || "?";
};

/** Primeiro nome do usuário (para a saudação). */
export const firstName = (user) => {
  if (user?.name) return user.name.trim().split(/\s+/)[0];
  if (user?.email) return user.email.split("@")[0];
  return "visitante";
};
