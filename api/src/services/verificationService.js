const { URL } = require('url');

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

// Motor Principal: Integração com o Google
const verifyUrl = async (urlString) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error("Falha no Servidor: Chave da API do Google não configurada no arquivo .env.");
  }

  const googleApiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

  // Estrutura exigida pela documentação v4 do Google
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

  // Execução do POST assíncrono para a nuvem do Google
  const response = await fetch(googleApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Google API rejeitou a requisição. Código HTTP: ${response.status}`);
  }

  const data = await response.json();

  // Se o array 'matches' existir, a URL está na lista negra global
  if (data.matches && data.matches.length > 0) {
    return {
      is_danger: true,
      status: "GOLPE CONFIRMADO",
      reason: "URL identificada como maliciosa no banco de dados oficial do Google Safe Browsing."
    };
  }

  // Se a URL passar pelo Google, acionamos nosso motor interno como segunda barreira
  return checkStaticHeuristics(urlString);
};

module.exports = {
  verifyUrl
};