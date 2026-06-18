const puppeteer = require("puppeteer-core");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const {
  sanitizeViolations,
  formatDetailedViolations,
} = require("../utils/axeViolations");
const {
  resolveChromiumExecutable,
  configurePage,
  navigateForAudit,
  waitForPageReady,
  scrollLazyFrames,
  isFrameReadinessError,
} = require("../utils/axePagePrep");

// Limite rígido para segurança contra hang em sites maliciosos (máximo 15000ms)
const AXE_TIMEOUT_MS = Math.min(parseInt(process.env.AXE_TIMEOUT_MS, 10) || 15000, 15000);

let browserInstance = null;
let pagesProcessed = 0;
let idleTimeoutId = null;

const MAX_PAGES_PER_BROWSER = 50;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const isAxeEnabled = () =>
  process.env.NODE_ENV !== "test" && process.env.AXE_ENABLED !== "false";

const closeBrowser = async () => {
  if (idleTimeoutId) {
    clearTimeout(idleTimeoutId);
    idleTimeoutId = null;
  }
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
  pagesProcessed = 0;
};

const resetIdleTimeout = () => {
  if (idleTimeoutId) clearTimeout(idleTimeoutId);
  idleTimeoutId = setTimeout(async () => {
    console.log(
      "[SENTRY-AXE] Encerrando o navegador Chromium por inatividade (Libertação de RAM).",
    );
    await closeBrowser();
  }, IDLE_TIMEOUT_MS);
};

const getBrowser = async () => {
  if (pagesProcessed >= MAX_PAGES_PER_BROWSER) {
    console.log(
      `[SENTRY-AXE] Limite de ${MAX_PAGES_PER_BROWSER} análises atingido. A reciclar a instância do Chromium...`,
    );
    await closeBrowser();
  }

  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: resolveChromiumExecutable(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--disable-extensions",
      ],
    });
    pagesProcessed = 0;
  }

  resetIdleTimeout();
  return browserInstance;
};

/**
 * Executa o axe na página com retentativas graduais quando o frame ainda não
 * está pronto
 */
const runAxeAnalysis = async (page) => {
  const attempt = async (legacyMode = false) => {
    let builder = new AxePuppeteer(page);
    if (legacyMode) builder = builder.setLegacyMode();
    return builder.analyze();
  };

  try {
    return await attempt(false);
  } catch (firstError) {
    if (!isFrameReadinessError(firstError)) throw firstError;

    console.warn(
      "[SENTRY-AXE] Frame não pronto — aguardando rede, scroll e nova tentativa…",
    );
    await waitForPageReady(page, 8000);
    await scrollLazyFrames(page).catch(() => {});

    try {
      return await attempt(false);
    } catch (secondError) {
      if (!isFrameReadinessError(secondError)) throw secondError;
      console.warn("[SENTRY-AXE] Recorrendo ao legacy mode do axe-core…");
      return attempt(true);
    }
  }
};

/**
 * Executa axe-core na URL via Puppeteer (navegador headless).
 *
 * @param {string} urlString - URL a auditar
 * @param {{ devMode?: boolean }} [options] - Quando devMode=true, inclui detailedViolations no retorno
 */
const auditUrl = async (urlString, options = {}) => {
  const { devMode = false } = options;
  if (!isAxeEnabled()) {
    return {
      violations: [],
      passes_count: 0,
      incomplete_count: 0,
      source: "skipped",
      error: "Auditoria axe desabilitada neste ambiente.",
    };
  }

  let page = null;

  try {
    const browser = await getBrowser();
    pagesProcessed++;

    // Usamos `newPage()` em vez de `createBrowserContext()`: o contexto
    // isolado fazia o axe falhar com "Page/Frame is not ready" em sites reais.
    page = await browser.newPage();
    await configurePage(page, AXE_TIMEOUT_MS);
    await navigateForAudit(page, urlString, AXE_TIMEOUT_MS);
    await waitForPageReady(page);

    const results = await runAxeAnalysis(page);
    const rawViolations = results.violations || [];
    const violations = sanitizeViolations(rawViolations);

    const payload = {
      violations,
      // Regras que a página passou/ficaram incompletas — usadas para amortecer
      // a nota pela cobertura (computeQualityRating).
      passes_count: Array.isArray(results.passes) ? results.passes.length : 0,
      incomplete_count: Array.isArray(results.incomplete)
        ? results.incomplete.length
        : 0,
      source: "server",
      error: null,
    };

    if (devMode) {
      payload.detailedViolations = formatDetailedViolations(rawViolations);
    }

    return payload;
  } catch (error) {
    console.warn(`[SENTRY-AXE] Falha ao auditar ${urlString}:`, error.message);
    return {
      violations: [],
      passes_count: 0,
      incomplete_count: 0,
      source: "server",
      error: error.message,
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
};

process.on("SIGTERM", async () => await closeBrowser());
process.on("SIGINT", async () => await closeBrowser());

module.exports = {
  auditUrl,
  closeBrowser,
  isAxeEnabled,
  sanitizeViolations,
  formatDetailedViolations,
};
