const historyRepository = require("../repositories/historyRepository");
const axeService = require("./axeService");
const {
  computeAccessibilityScore,
  computeQualityRating,
} = require("../utils/accessibilityScore");
const { checkStaticHeuristics } = require("../utils/urlHeuristics");
const {
  extractSiteHost,
  normalizeAnalysisUrl,
} = require("../utils/urlNormalize");
const { formatDetailedViolations } = require("../utils/axeViolations");
const logger = require("../utils/logger");

const GOOGLE_SAFE_BROWSING_TIMEOUT_MS =
  parseInt(process.env.GOOGLE_SAFE_BROWSING_TIMEOUT_MS, 10) || 5000;

const sanitizeClientReport = (report) => {
  if (!Array.isArray(report)) return [];
  return report.slice(0, 50).map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes_count: Array.isArray(violation.nodes) ? violation.nodes.length : 0,
  }));
};

const parseCachedViolations = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const buildAccessibilityPayload = (
  sanitizedReport,
  axeMeta,
  devMode = false,
) => {
  const fromCache = Boolean(axeMeta.fromCache);
  const penaltyScore =
    fromCache && axeMeta.cachedScores
      ? axeMeta.cachedScores.accessibility_score
      : computeAccessibilityScore(sanitizedReport);
  const passesCount = axeMeta.passesCount ?? 0;
  const qualityRating =
    fromCache && axeMeta.cachedScores
      ? axeMeta.cachedScores.quality_rating
      : computeQualityRating(penaltyScore, {
          violationsCount: sanitizedReport.length,
          passesCount,
        });

  const payload = {
    report_received: sanitizedReport.length > 0,
    violations_count: sanitizedReport.length,
    sanitized_violations_stored: sanitizedReport.length,
    passes_count: passesCount,
    accessibility_score: penaltyScore,
    quality_rating: qualityRating,
    axe_source: axeMeta.source,
    axe_error: axeMeta.error || null,
    from_cache: fromCache,
    // Inclui o array de violações (já enriquecidas com Linguagem Simples pelo
    // axeViolations.js) para que o popup da extensão possa exibi-las ao usuário
    // sem precisar ativar o devMode ou fazer uma segunda requisição.
    violations: sanitizedReport,
  };

  if (devMode && axeMeta.detailedViolations?.length > 0) {
    payload.detailed_report = axeMeta.detailedViolations;
  }

  return payload;
};

/**
 * Monta a resposta final da análise.
 *
 * Inclui o bloco `persistence` para que o cliente saiba se o registro foi salvo
 * no banco — útil para diagnóstico quando o PostgreSQL está indisponível.
 * O fluxo de segurança/acessibilidade NÃO é interrompido por falha de DB:
 * a extensão continua recebendo o alerta de golpe normalmente.
 */
const buildResponse = ({
  analysisId,
  securityResult,
  accessibility,
  securityFromCache,
  persistence,
}) => ({
  analysis_id: analysisId,
  security: {
    ...securityResult,
    from_cache: securityFromCache,
  },
  accessibility,
  persistence,
  // Bug #8 — anteriormente estava sempre `false`, mesmo quando ambos os
  // resultados vinham do cache. Agora reflete o estado real da análise.
  cached: securityFromCache && Boolean(accessibility.from_cache),
});

/**
 * Tenta recuperar uma análise de segurança recente em cache (24 h).
 *
 * IMPORTANTE: protege o fluxo contra indisponibilidade do banco. Se o
 * Postgres estiver fora do ar, a consulta retorna `null` e o restante do
 * pipeline (Google Safe Browsing + heurísticas) continua executando
 * normalmente — a extensão recebe o alerta, apenas sem o benefício do cache.
 */
const tryFindCachedSecurity = async (urlString) => {
  try {
    return await historyRepository.findCachedSecurityByUrl(urlString);
  } catch (err) {
    logger.warn(
      `[DB-CACHE] Falha ao consultar cache de segurança para ${urlString}: ${err.message}`,
    );
    return null;
  }
};

const tryFindCachedAccessibility = async (urlString) => {
  try {
    return await historyRepository.findCachedAccessibilityByUrl(urlString);
  } catch (err) {
    logger.warn(
      `[DB-CACHE] Falha ao consultar cache de acessibilidade para ${urlString}: ${err.message}`,
    );
    return null;
  }
};

const runSecurityCheck = async (urlString) => {
  const cached = await tryFindCachedSecurity(urlString);

  if (cached) {
    return {
      result: {
        is_danger: cached.is_danger,
        status: cached.status,
        reason: cached.reason,
      },
      fromCache: true,
    };
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  let securityResult = null;

  try {
    if (!apiKey) {
      throw new Error("Chave da API do Google ausente no .env.");
    }

    const googleApiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      GOOGLE_SAFE_BROWSING_TIMEOUT_MS,
    );

    let response;
    try {
      response = await fetch(googleApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "ifc-videira-sentinela", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: urlString }],
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Google API HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.matches?.length > 0) {
      securityResult = {
        is_danger: true,
        status: "GOLPE CONFIRMADO",
        reason:
          "URL identificada como maliciosa no banco de dados oficial do Google Safe Browsing.",
      };
    } else {
      securityResult = checkStaticHeuristics(urlString);
    }
  } catch (externalApiError) {
    logger.warn(
      `[SAFE-BROWSING] Falha na verificação externa. Fallback heurístico local: ${externalApiError.message}`,
    );
    securityResult = checkStaticHeuristics(urlString);
  }

  return { result: securityResult, fromCache: false };
};

/**
 * Persiste a análise no banco com tratamento isolado de erro.
 *
 * Estratégia de degradação: se o Postgres estiver indisponível, NÃO propagamos
 * a exceção — a análise de segurança/acessibilidade é uma feature de tempo real
 * que deve continuar funcionando. Em vez disso, registramos o erro estruturado
 * via winston e devolvemos um payload `persistence` que descreve o estado para
 * o cliente (campo `persisted: false` e mensagem amigável).
 */
const persistAnalysis = async (payload) => {
  try {
    const saved = await historyRepository.saveAnalysis(payload);
    return {
      analysisId: saved?.id ?? null,
      persistence: {
        persisted: true,
        error: null,
      },
    };
  } catch (dbError) {
    logger.error(
      `[DB-PERSISTENCE] Falha ao salvar análise da URL ${payload.url}: ${dbError.message}`,
      { url: payload.url, siteHost: payload.siteHost, code: dbError.code },
    );
    return {
      analysisId: null,
      persistence: {
        persisted: false,
        error:
          "Análise não foi gravada no histórico — banco de dados indisponível. O alerta de segurança permanece válido.",
      },
    };
  }
};

const buildAccessibilityFromCache = (cached) => {
  const violations = parseCachedViolations(cached.accessibility_violations);

  return {
    violations,
    detailedViolations: undefined,
    passesCount: 0,
    source: cached.axe_source || "server",
    error: null,
    fromCache: true,
    cachedScores: {
      accessibility_score: cached.accessibility_score,
      quality_rating: cached.quality_rating,
    },
  };
};

/**
 * Resolve o relatório de acessibilidade com prioridade para o servidor (axe-core/Puppeteer).
 * Se a auditoria no servidor falhar sem violações, usa o fallback do cliente.
 *
 * @param {boolean} devMode - Quando true, preserva detailedViolations do axe para a resposta
 */
const resolveAccessibilityReport = async (
  urlString,
  clientReport,
  devMode = false,
) => {
  if (!devMode) {
    const cached = await tryFindCachedAccessibility(urlString);
    if (cached) {
      return buildAccessibilityFromCache(cached);
    }
  }

  const serverAudit = await axeService.auditUrl(urlString, { devMode });

  if (serverAudit.violations.length > 0 || !serverAudit.error) {
    return {
      violations: serverAudit.violations,
      detailedViolations: serverAudit.detailedViolations,
      passesCount: serverAudit.passes_count ?? 0,
      source: serverAudit.source,
      error: serverAudit.error,
      fromCache: false,
    };
  }

  const clientViolations = sanitizeClientReport(clientReport);
  if (clientViolations.length > 0) {
    const meta = {
      violations: clientViolations,
      // Fallback do cliente não informa regras aprovadas — sem amortecimento.
      passesCount: 0,
      source: "client",
      error: serverAudit.error,
      fromCache: false,
    };

    if (devMode && Array.isArray(clientReport)) {
      meta.detailedViolations = formatDetailedViolations(clientReport);
    }

    return meta;
  }

  return {
    violations: [],
    detailedViolations: devMode ? [] : undefined,
    passesCount: serverAudit.passes_count ?? 0,
    source: serverAudit.source,
    error: serverAudit.error,
    fromCache: false,
  };
};

/**
 * Orquestra a verificação completa de uma URL: segurança (Google/heurísticas),
 * acessibilidade (axe-core) e persistência no histórico.
 *
 * @param {boolean} [devMode=false] - Relatório de acessibilidade detalhado na resposta (não altera o que é salvo no banco)
 */
const verifyUrl = async (
  urlString,
  accessibilityReport,
  userId = null,
  devMode = false,
) => {
  const normalizedUrl = normalizeAnalysisUrl(urlString);
  const siteHost = extractSiteHost(normalizedUrl);

  const [{ result: securityResult, fromCache: securityFromCache }, axeMeta] =
    await Promise.all([
      runSecurityCheck(normalizedUrl),
      resolveAccessibilityReport(normalizedUrl, accessibilityReport, devMode),
    ]);

  const accessibility = buildAccessibilityPayload(
    axeMeta.violations,
    axeMeta,
    devMode,
  );

  const { analysisId, persistence } = await persistAnalysis({
    userId,
    url: normalizedUrl,
    siteHost,
    isDanger: securityResult.is_danger,
    status: securityResult.status,
    reason: securityResult.reason,
    accessibilityViolations: axeMeta.violations,
    accessibilityScore: accessibility.accessibility_score,
    qualityRating: accessibility.quality_rating,
    axeSource: accessibility.axe_source,
    securityFromCache: securityFromCache,
  });

  return buildResponse({
    analysisId,
    securityResult,
    accessibility,
    securityFromCache,
    persistence,
  });
};

module.exports = {
  verifyUrl,
  runSecurityCheck,
  resolveAccessibilityReport,
  buildAccessibilityPayload,
  persistAnalysis,
  tryFindCachedSecurity,
  tryFindCachedAccessibility,
  normalizeAnalysisUrl,
};
