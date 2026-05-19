const { URL } = require('url');
const historyRepository = require('../repositories/historyRepository');
const { computeAccessibilityScore } = require('../utils/accessibilityScore');

const checkStaticHeuristics = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);
    const domain = parsedUrl.hostname;

    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
    const hyphenCount = (domain.match(/-/g) || []).length;
    const manyHyphens = hyphenCount >= 3;
    const suspiciousTld = /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$/.test(domain);

    if (isIp || manyHyphens || suspiciousTld) {
      return {
        is_danger: true,
        status: 'Aparência Suspeita (Heurística)',
        reason: 'Características estruturais da URL fortemente associadas a golpes.'
      };
    }

    return {
      is_danger: false,
      status: 'Seguro',
      reason: 'Nenhuma ameaça detectada localmente ou nos bancos de dados.'
    };
  } catch {
    return {
      is_danger: true,
      status: 'Erro de Formato',
      reason: 'A URL fornecida possui uma estrutura anômala ou ilegível.'
    };
  }
};

const sanitizeAccessibilityReport = (report) => {
  if (!Array.isArray(report)) return [];

  const MAX_VIOLATIONS = 50;
  const limitedReport = report.slice(0, MAX_VIOLATIONS);

  return limitedReport.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes_count: Array.isArray(violation.nodes) ? violation.nodes.length : 0
  }));
};

const buildResponse = ({
  analysisId,
  securityResult,
  sanitizedReport,
  rawReportLength,
  cached
}) => ({
  analysis_id: analysisId,
  security: securityResult,
  accessibility: {
    report_received: rawReportLength > 0,
    violations_count: rawReportLength,
    sanitized_violations_stored: sanitizedReport.length,
    accessibility_score: computeAccessibilityScore(sanitizedReport)
  },
  cached
});

const persistAnalysis = async ({
  userId,
  urlString,
  securityResult,
  sanitizedReport,
  accessibilityScore
}) => {
  const payload = {
    url: urlString,
    isDanger: securityResult.is_danger,
    status: securityResult.status,
    reason: securityResult.reason,
    accessibilityViolations: sanitizedReport,
    accessibilityScore
  };

  if (userId) {
    const saved = await historyRepository.saveAnalysis({ userId, ...payload });
    return saved.id;
  }

  return historyRepository.saveAnonymousAnalysis(payload);
};

const verifyUrl = async (urlString, accessibilityReport, userId = null) => {
  try {
    const cachedRecord = await historyRepository.findCachedByUrl(urlString);

    if (cachedRecord) {
      console.log(`[SENTRY-CACHE] URL interceptada no banco local: ${urlString}`);

      let analysisId = cachedRecord.id;

      if (userId) {
        const saved = await historyRepository.saveAnalysis({
          userId,
          url: urlString,
          isDanger: cachedRecord.is_danger,
          status: cachedRecord.status,
          reason: cachedRecord.reason,
          accessibilityViolations: cachedRecord.accessibility_violations || [],
          accessibilityScore: cachedRecord.accessibility_score || 0
        });
        analysisId = saved.id;
      }

      return buildResponse({
        analysisId,
        securityResult: {
          is_danger: cachedRecord.is_danger,
          status: cachedRecord.status,
          reason: cachedRecord.reason
        },
        sanitizedReport: cachedRecord.accessibility_violations || [],
        rawReportLength: Array.isArray(accessibilityReport) ? accessibilityReport.length : 0,
        cached: true
      });
    }
  } catch (cacheError) {
    console.warn('[SENTRY-WARNING] Falha ao consultar o cache:', cacheError.message);
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  let securityResult = null;

  const googleApiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

  const payload = {
    client: {
      clientId: 'ifc-videira-sentinela',
      clientVersion: '1.0.0'
    },
    threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url: urlString }]
    }
  };

  try {
    if (!apiKey) {
      throw new Error('Chave da API do Google ausente no .env.');
    }

    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Google API rejeitou a requisição HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.matches && data.matches.length > 0) {
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
      `[SENTRY-WARNING] Falha na comunicação externa. Acionando Fallback Local. Motivo: ${externalApiError.message}`
    );
    securityResult = checkStaticHeuristics(urlString);
  }

  const sanitizedReport = sanitizeAccessibilityReport(accessibilityReport);
  const accessibilityScore = computeAccessibilityScore(sanitizedReport);

  let savedRecordId = null;

  try {
    savedRecordId = await persistAnalysis({
      userId,
      urlString,
      securityResult,
      sanitizedReport,
      accessibilityScore
    });
  } catch (dbError) {
    console.error('Falha ao persistir a análise no PostgreSQL:', dbError);
  }

  return buildResponse({
    analysisId: savedRecordId,
    securityResult,
    sanitizedReport,
    rawReportLength: accessibilityReport ? accessibilityReport.length : 0,
    cached: false
  });
};

module.exports = {
  verifyUrl
};
