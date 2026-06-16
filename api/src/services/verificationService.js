const historyRepository = require("../repositories/historyRepository");
const axeService = require("./axeService");
const {
  computeAccessibilityScore,
  computeQualityRating,
} = require("../utils/accessibilityScore");
const { checkStaticHeuristics } = require("../utils/urlHeuristics");
const { extractSiteHost } = require("../utils/urlNormalize");
const { formatDetailedViolations } = require("../utils/axeViolations");
const logger = require("../utils/logger");

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

const buildAccessibilityPayload = (
  sanitizedReport,
  axeMeta,
  devMode = false,
) => {
  const penaltyScore = computeAccessibilityScore(sanitizedReport);
  const passesCount = axeMeta.passesCount ?? 0;
  const qualityRating = computeQualityRating(penaltyScore, {
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
  cached: false,
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

    const response = await fetch(googleApiUrl, {
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
    });

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
  const serverAudit = await axeService.auditUrl(urlString, { devMode });

  if (serverAudit.violations.length > 0 || !serverAudit.error) {
    return {
      violations: serverAudit.violations,
      detailedViolations: serverAudit.detailedViolations,
      passesCount: serverAudit.passes_count ?? 0,
      source: serverAudit.source,
      error: serverAudit.error,
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
  const siteHost = extractSiteHost(urlString);

  const { result: securityResult, fromCache: securityFromCache } =
    await runSecurityCheck(urlString);

  const axeMeta = await resolveAccessibilityReport(
    urlString,
    accessibilityReport,
    devMode,
  );
  const accessibility = buildAccessibilityPayload(
    axeMeta.violations,
    axeMeta,
    devMode,
  );

  const { analysisId, persistence } = await persistAnalysis({
    userId,
    url: urlString,
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
};
