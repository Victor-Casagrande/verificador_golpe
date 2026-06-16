const { URL } = require("url");

const SUSPICIOUS_KEYWORDS = [
  "login",
  "secure",
  "account",
  "update",
  "banking",
  "verify",
  "free",
  "admin",
  "password",
  "recover",
  "promocao",
  "oferta",
  "oficial"
];

const SUSPICIOUS_DOMAINS = [
  "ngrok.io",
  "duckdns.org",
  "noip.com",
  "ddns.net",
  "serveo.net",
  "localtunnel.me",
];

const WHITELISTED_DOMAINS = [
  "google.com",
  "amazon.com",
  "microsoft.com",
  "github.com",
  "apple.com",
  "facebook.com",
  "linkedin.com",
  "twitter.com",
  "instagram.com",
  "youtube.com",
  "netflix.com"
];

const checkStaticHeuristics = (urlString) => {
  try {
    const parsedUrl = new URL(urlString);
    const domain = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();
    const fullUrl = urlString.toLowerCase();

    // Whitelist check
    const isWhitelisted = WHITELISTED_DOMAINS.some(
      (wl) => domain === wl || domain.endsWith(`.${wl}`)
    );
    if (isWhitelisted) {
      return {
        is_danger: false,
        status: "Seguro",
        reason: "Domínio conhecido e confiável (Whitelist).",
      };
    }

    let score = 0;
    let reasons = [];

    // Valid IPv4 Regex (0-255 blocks)
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    const isIp = ipv4Regex.test(domain);
    if (isIp) {
      score += 60;
      reasons.push("Uso de endereço IP direto.");
    }

    const hyphenCount = (domain.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      score += 30;
      reasons.push("Quantidade excessiva de hífens.");
    }

    const suspiciousTld = /\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$|\.top$|\.pw$/.test(domain);
    if (suspiciousTld) {
      score += 40;
      reasons.push("TLD de baixa reputação.");
    }

    const isDynamicDns = SUSPICIOUS_DOMAINS.some((d) => domain.endsWith(d));
    if (isDynamicDns) {
      score += 60;
      reasons.push("Uso de DNS dinâmico/Túnel.");
    }

    const hasSuspiciousKeyword = SUSPICIOUS_KEYWORDS.some(
      (keyword) => domain.includes(keyword) || pathname.includes(keyword)
    );
    if (hasSuspiciousKeyword) {
      score += 30;
      reasons.push("Palavras-chave suspeitas.");
    }

    const domainParts = domain.split(".");
    if (domainParts.length >= 5 && !isIp) {
      score += 30;
      reasons.push("Excesso de subdomínios.");
    }

    if (fullUrl.length > 200) {
      score += 20;
      reasons.push("URL muito longa.");
    }

    // Limiar de perigo: >= 50
    if (score >= 50) {
      return {
        is_danger: true,
        status: "Aparência Suspeita (Heurística)",
        reason: reasons.join(" ") + ` (Score: ${score})`,
      };
    }

    return {
      is_danger: false,
      status: "Seguro",
      reason: "Nenhuma ameaça heurística significativa.",
    };
  } catch {
    return {
      is_danger: true,
      status: "Erro de Formato",
      reason: "A URL fornecida possui formato inválido.",
    };
  }
};

module.exports = {
  checkStaticHeuristics,
};
