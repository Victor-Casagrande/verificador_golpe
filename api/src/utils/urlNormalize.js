const { URL } = require("url");

/**
 * Normaliza URLs para cache, persistência e comparação.
 * - hostname em minúsculas
 * - remove fragmento (#)
 * - remove porta padrão (80/443)
 * - remove barra final do path (exceto raiz)
 */
const normalizeAnalysisUrl = (urlString) => {
  const trimmed = String(urlString).trim();
  const parsed = new URL(trimmed);

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.hash = "";

  if (
    (parsed.protocol === "https:" && parsed.port === "443") ||
    (parsed.protocol === "http:" && parsed.port === "80")
  ) {
    parsed.port = "";
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.href;
};

const extractSiteHost = (urlString) => {
  try {
    const parsed = new URL(normalizeAnalysisUrl(urlString));
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
};

module.exports = {
  normalizeAnalysisUrl,
  extractSiteHost,
};
