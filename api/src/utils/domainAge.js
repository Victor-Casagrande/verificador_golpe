/**
 * domainAge.js
 *
 * Consulta WHOIS para detectar se um domínio foi registrado há menos de 30 dias.
 * Toda a função é fail-safe: qualquer falha (timeout, servidor WHOIS indisponível,
 * formato inesperado) retorna null silenciosamente, sem quebrar o fluxo principal.
 *
 * Integração: chamada no verificationService → checkStaticHeuristics enriquecido.
 */

const whoiser = require("whoiser");
const { URL }  = require("url");

/** Tempo máximo para a consulta WHOIS antes de desistir (ms). */
const WHOIS_TIMEOUT_MS = 4000;

/** Domínios que duram menos de 30 dias legitimamente (ex: provedores de TLD gerido). */
const WHOIS_SKIP_TLDS = new Set(["gov", "edu", "mil"]);

/**
 * Tenta extrair a data de criação do resultado WHOIS de um servidor específico.
 * O `whoiser` retorna um objeto onde cada chave é o servidor WHOIS e o valor
 * é um objeto com os campos. Os nomes dos campos variam entre servidores.
 *
 * @param {Object} whoisData - Resultado de whoiser.domain()
 * @returns {Date|null}
 */
function extractCreationDate(whoisData) {
  const CREATION_FIELDS = [
    "Created Date",
    "Creation Date",
    "created",
    "Domain Registration Date",
    "Registration Time",
    "Registered",
    "domain_dateregistered",
    "Registration Date",
  ];

  for (const serverKey of Object.keys(whoisData)) {
    const record = whoisData[serverKey];
    if (!record || typeof record !== "object") continue;

    for (const field of CREATION_FIELDS) {
      const raw = record[field];
      if (!raw) continue;

      const value = Array.isArray(raw) ? raw[0] : raw;
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return null;
}

/**
 * Verifica se um domínio foi registrado há menos de `thresholdDays` dias.
 *
 * @param {string} urlString - URL completa a ser avaliada
 * @param {number} [thresholdDays=30] - Limiar em dias para classificar o domínio como "novo"
 * @returns {Promise<{ isNewDomain: boolean, ageInDays: number|null, createdAt: Date|null }|null>}
 *          Retorna null se a consulta falhar ou o domínio for inelegível para verificação.
 */
async function checkDomainAge(urlString, thresholdDays = 30) {
  try {
    const parsed  = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // Pula TLDs governamentais/educacionais — são confiáveis por definição.
    const tld = hostname.split(".").pop();
    if (WHOIS_SKIP_TLDS.has(tld)) return null;

    // Timeout manual: race entre a consulta WHOIS e uma rejeição temporizada.
    const whoisData = await Promise.race([
      whoiser.domain(hostname, { follow: 1 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("WHOIS timeout")), WHOIS_TIMEOUT_MS)
      ),
    ]);

    if (!whoisData || typeof whoisData !== "object") return null;

    const createdAt = extractCreationDate(whoisData);
    if (!createdAt) return null;

    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / 86_400_000);
    return {
      isNewDomain: ageInDays < thresholdDays,
      ageInDays,
      createdAt,
    };
  } catch {
    // Falha silenciosa — WHOIS é best-effort, nunca bloqueia a análise principal.
    return null;
  }
}

module.exports = { checkDomainAge };
