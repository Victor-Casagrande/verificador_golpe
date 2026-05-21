const { URL } = require('url');

const SUSPICIOUS_KEYWORDS = [
  'login', 'secure', 'account', 'update', 'banking', 
  'verify', 'free', 'admin', 'password', 'recover'
];

const SUSPICIOUS_DOMAINS = [
  'ngrok.io', 'duckdns.org', 'noip.com', 'ddns.net', 
  'serveo.net', 'localtunnel.me'
];

const checkStaticHeuristics = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);
    const domain = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();
    const fullUrl = urlString.toLowerCase();

    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
    if (isIp) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'Uso de endereço IP direto em vez de nome de domínio registrado.' 
      };
    }

    const hyphenCount = (domain.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'Quantidade excessiva de hífens no domínio, uma característica comum de camuflagem cibernética.' 
      };
    }

    const suspiciousTld = /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$|\.top$|\.pw$/.test(domain);
    if (suspiciousTld) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'Extensão de domínio (TLD) de baixa reputação, frequentemente associada a fraudes.' 
      };
    }

    const isDynamicDns = SUSPICIOUS_DOMAINS.some(suspiciousDomain => domain.endsWith(suspiciousDomain));
    if (isDynamicDns) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'Hospedado em um serviço de DNS dinâmico ou túnel temporário, mascarando o servidor real.' 
      };
    }

    const hasSuspiciousKeyword = SUSPICIOUS_KEYWORDS.some(keyword => domain.includes(keyword) || pathname.includes(keyword));
    if (hasSuspiciousKeyword) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'A URL contém palavras-chave de urgência ou identificação (ex: "login", "secure", "verify") típicas de engenharia social.' 
      };
    }

    const domainParts = domain.split('.');
    if (domainParts.length >= 5) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'Estrutura anormalmente profunda de subdomínios, utilizada para ofuscar o verdadeiro domínio base.' 
      };
    }
    
    if (fullUrl.length > 200) {
      return { 
        is_danger: true, 
        status: 'Aparência Suspeita (Heurística)', 
        reason: 'URL excessivamente longa, frequentemente usada para esconder payloads de ataque ou dificultar a leitura humana.' 
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
      reason: 'A URL fornecida possui uma estrutura anômala ou ilegível, impossibilitando a análise estática.'
    };
  }
};

module.exports = {
  checkStaticHeuristics
};