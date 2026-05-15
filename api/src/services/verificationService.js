const { URL } = require('url');
const db = require('../config/database'); // Importação do pool de conexão com o PostgreSQL

// Motor secundário: Análise Estática Local (Heurísticas)
const checkStaticHeuristics = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);
    const domain = parsedUrl.hostname;

    // Regra 1: Domínio é um endereço IP direto? (Ex: 192.168.1.1)
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);

    // Regra 2: Quantidade excessiva de hífens (Típico de camuflagem de domínio)
    const hyphenCount = (domain.match(/-/g) || []).length;
    const manyHyphens = hyphenCount >= 3;

    // Regra 3: TLDs frequentemente associados a fraudes
    const suspiciousTld = /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$/.test(domain);

    if (isIp || manyHyphens || suspiciousTld) {
      return {
        is_danger: true,
        status: "Aparência Suspeita (Heurística)",
        reason: "Características estruturais da URL fortemente associadas a golpes."
      };
    }

    return { 
      is_danger: false, 
      status: "Seguro", 
      reason: "Nenhuma ameaça detectada localmente ou nos bancos de dados." 
    };

  } catch (error) {
    return { 
      is_danger: true, 
      status: "Erro de Formato", 
      reason: "A URL fornecida possui uma estrutura anômala ou ilegível." 
    };
  }
};

// Correção de Segurança 1: Função para sanitizar e podar o payload do Axe-core 
const sanitizeAccessibilityReport = (report) => {
  if (!Array.isArray(report)) return [];
  
  const MAX_VIOLATIONS = 50;
  const limitedReport = report.slice(0, MAX_VIOLATIONS);

  return limitedReport.map(violation => {
    return {
      id: violation.id,
      impact: violation.impact,
      description: violation.description,
      helpUrl: violation.helpUrl,
      nodes_count: Array.isArray(violation.nodes) ? violation.nodes.length : 0
    };
  });
};

// Motor Principal: Integração com o Google, processamento estruturado e persistência no PostgreSQL
const verifyUrl = async (urlString, accessibilityReport) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  let securityResult = null;

  const googleApiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

  const payload = {
    client: {
      clientId: "ifc-videira-sentinela",
      clientVersion: "1.0.0"
    },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [
        { url: urlString }
      ]
    }
  };

  // Correção de Segurança 2: Padrão de Fallback para o Motor Principal
  try {
    if (!apiKey) {
      throw new Error("Chave da API do Google ausente no .env.");
    }

    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Google API rejeitou a requisição HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (data.matches && data.matches.length > 0) {
      securityResult = {
        is_danger: true,
        status: "GOLPE CONFIRMADO",
        reason: "URL identificada como maliciosa no banco de dados oficial do Google Safe Browsing."
      };
    } else {
      securityResult = checkStaticHeuristics(urlString);
    }

  } catch (externalApiError) {
    // Em caso de falha externa (sem internet, sem cota, sem chave), logamos o erro para a equipe
    // e acionamos IMEDIATAMENTE o motor de heurísticas para não deixar o usuário vulnerável.
    console.warn(`[SENTRY-WARNING] Falha na comunicação externa. Acionando Fallback Local. Motivo: ${externalApiError.message}`);
    securityResult = checkStaticHeuristics(urlString);
  }

  const sanitizedReport = sanitizeAccessibilityReport(accessibilityReport);
  const violationsJsonb = JSON.stringify(sanitizedReport);

  const insertQuery = `
    INSERT INTO url_analyses (url, is_danger, status, reason, accessibility_violations)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  
  const queryValues = [
    urlString,
    securityResult.is_danger,
    securityResult.status,
    securityResult.reason,
    violationsJsonb
  ];

  let savedRecordId = null;

  try {
    const dbResult = await db.query(insertQuery, queryValues);
    savedRecordId = dbResult.rows[0].id;
  } catch (dbError) {
    console.error("Falha silenciosa ao persistir a análise no PostgreSQL:", dbError);
  }

  return {
    analysis_id: savedRecordId,
    security: securityResult,
    accessibility: {
      report_received: !!accessibilityReport,
      violations_count: accessibilityReport ? accessibilityReport.length : 0,
      sanitized_violations_stored: sanitizedReport.length
    }
  };
};

module.exports = {
  verifyUrl
};