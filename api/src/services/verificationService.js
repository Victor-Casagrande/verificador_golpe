const historyRepository = require('../repositories/historyRepository');
const axeService = require('./axeService');
const {
  computeAccessibilityScore,
  computeQualityRating
} = require('../utils/accessibilityScore');
const { checkStaticHeuristics } = require('../utils/urlHeuristics');
const { extractSiteHost } = require('../utils/urlNormalize');

const sanitizeClientReport = (report) => {
  if (!Array.isArray(report)) return [];
  return report.slice(0, 50).map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes_count: Array.isArray(violation.nodes) ? violation.nodes.length : 0
  }));
};

const buildAccessibilityPayload = (sanitizedReport, axeMeta) => {
  const penaltyScore = computeAccessibilityScore(sanitizedReport);
  const qualityRating = computeQualityRating(penaltyScore);

  return {
    report_received: sanitizedReport.length > 0,
    violations_count: sanitizedReport.length,
    sanitized_violations_stored: sanitizedReport.length,
    accessibility_score: penaltyScore,
    quality_rating: qualityRating,
    axe_source: axeMeta.source,
    axe_error: axeMeta.error || null
  };
};

const buildResponse = ({
  analysisId,
  securityResult,
  accessibility,
  securityFromCache
}) => ({
  analysis_id: analysisId,
  security: {
    ...securityResult,
    from_cache: securityFromCache
  },
  accessibility,
  cached: false
});

const runSecurityCheck = async (urlString) => {
  const cached = await historyRepository.findCachedSecurityByUrl(urlString);

  if (cached) {
    return {
      result: {
        is_danger: cached.is_danger,
        status: cached.status,
        reason: cached.reason
      },
      fromCache: true
    };
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  let securityResult = null;

  try {
    if (!apiKey) {
      throw new Error('Chave da API do Google ausente no .env.');
    }

    const googleApiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'ifc-videira-sentinela', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: urlString }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google API HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.matches?.length > 0) {
      securityResult = {
        is_danger: true,
        status: 'GOLPE CONFIRMADO',
        reason: 'URL identificada como maliciosa no banco de dados oficial do Google Safe Browsing.'
      };
    } else {
      securityResult = checkStaticHeuristics(urlString);
    }
  } catch (externalApiError) {
    console.warn(
      `[SENTRY-WARNING] Falha na verificação externa. Fallback local: ${externalApiError.message}`
    );
    securityResult = checkStaticHeuristics(urlString);
  }

  return { result: securityResult, fromCache: false };
};

const resolveAccessibilityReport = async (urlString, clientReport) => {
  const serverAudit = await axeService.auditUrl(urlString);

  if (serverAudit.violations.length > 0 || !serverAudit.error) {
    return {
      violations: serverAudit.violations,
      source: serverAudit.source,
      error: serverAudit.error
    };
  }

  const clientViolations = sanitizeClientReport(clientReport);
  if (clientViolations.length > 0) {
    return {
      violations: clientViolations,
      source: 'client',
      error: serverAudit.error
    };
  }

  return {
    violations: [],
    source: serverAudit.source,
    error: serverAudit.error
  };
};

const verifyUrl = async (urlString, accessibilityReport, userId = null) => {
  const siteHost = extractSiteHost(urlString);

  const { result: securityResult, fromCache: securityFromCache } =
    await runSecurityCheck(urlString);

  const axeMeta = await resolveAccessibilityReport(urlString, accessibilityReport);
  const accessibility = buildAccessibilityPayload(axeMeta.violations, axeMeta);

  let analysisId = null;

  try {
    const saved = await historyRepository.saveAnalysis({
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
      securityFromCache: securityFromCache
    });
    analysisId = saved?.id ?? null;
  } catch (dbError) {
    console.error('Falha ao persistir análise:', dbError);
  }

  return buildResponse({
    analysisId,
    securityResult,
    accessibility,
    securityFromCache
  });
};

module.exports = {
  verifyUrl,
  runSecurityCheck,
  resolveAccessibilityReport
};
