/**
 * Auditoria de acessibilidade com Puppeteer + axe-core.
 * Gerencia pool de Chromium (reciclagem, idle timeout) e fallbacks de injeção.
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const { AxePuppeteer } = require("@axe-core/puppeteer");
const { sanitizeViolations, formatDetailedViolations } = require("../utils/axeViolations");
const {
  resolveChromiumExecutable,
  configurePage,
  navigateForAudit,
  preparePageForAxeAudit,
  isFrameReadinessError,
} = require("../utils/axePagePrep");

// Limite rígido para segurança contra hang em sites maliciosos (máximo 15000ms)
const AXE_TIMEOUT_MS = Math.min(parseInt(process.env.AXE_TIMEOUT_MS, 10) || 15000, 15000);

let browserInstance = null;
let pagesProcessed = 0;
let idleTimeoutId = null;

const MAX_PAGES_PER_BROWSER = 10;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const isAxeEnabled = () => process.env.NODE_ENV !== "test" && process.env.AXE_ENABLED !== "false";

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
      "[SENTINELA-AXE] Encerrando o navegador Chromium por inatividade (liberação de RAM).",
    );
    await closeBrowser();
  }, IDLE_TIMEOUT_MS);
};

const getBrowser = async () => {
  if (pagesProcessed >= MAX_PAGES_PER_BROWSER) {
    console.log(
      `[SENTINELA-AXE] Limite de ${MAX_PAGES_PER_BROWSER} análises atingido. Reciclando a instância do Chromium...`,
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
        "--memory-pressure-off",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-client-side-phishing-detection",
        "--disable-default-apps",
        "--disable-hang-monitor",
        "--disable-popup-blocking",
        "--disable-prompt-on-repost",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--safebrowsing-disable-auto-update",
      ],
    });
    pagesProcessed = 0;
  }

  resetIdleTimeout();
  return browserInstance;
};

/**
 * Fallback quando @axe-core/puppeteer não consegue injetar em subframes.
 * Audita só o documento principal — suficiente para a nota de acessibilidade.
 */
const runAxeMainFrameOnly = async (page) => {
  const axeSource = fs.readFileSync(require.resolve("axe-core"), "utf8");
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    window.axe.configure({
      branding: { application: "sentinela-axe-fallback" },
    });
    return window.axe.run(document);
  });
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

    console.warn("[SENTINELA-AXE] Frame não pronto — aguardando rede, scroll e nova tentativa…");
    await preparePageForAxeAudit(page, 8000);

    try {
      return await attempt(false);
    } catch (secondError) {
      if (!isFrameReadinessError(secondError)) throw secondError;
      console.warn("[SENTINELA-AXE] Recorrendo ao legacy mode do axe-core…");
      try {
        return await attempt(true);
      } catch (thirdError) {
        if (!isFrameReadinessError(thirdError)) throw thirdError;
        console.warn("[SENTINELA-AXE] Recorrendo à auditoria apenas no frame principal…");
        return runAxeMainFrameOnly(page);
      }
    }
  }
};

class Semaphore {
  constructor(max) {
    this.max = max;
    this.count = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.count < this.max) {
      this.count++;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release() {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      resolve();
    } else {
      this.count--;
    }
  }
}

// Limite de instâncias Puppeteer simultâneas para evitar OOM em ambientes com baixa RAM (ex: Render 512MB).
const AXE_CONCURRENCY = parseInt(process.env.AXE_CONCURRENCY, 10) || 1;
const axeSemaphore = new Semaphore(AXE_CONCURRENCY);

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

  await axeSemaphore.acquire();

  try {
    const browser = await getBrowser();
    pagesProcessed++;

    // Usamos `newPage()` em vez de `createBrowserContext()`: o contexto
    // isolado fazia o axe falhar com "Page/Frame is not ready" em sites reais.
    page = await browser.newPage();
    await configurePage(page, AXE_TIMEOUT_MS);
    await navigateForAudit(page, urlString, AXE_TIMEOUT_MS);
    await preparePageForAxeAudit(page, AXE_TIMEOUT_MS);

    const results = await runAxeAnalysis(page);
    const rawViolations = results.violations || [];
    const violations = sanitizeViolations(rawViolations);

    const payload = {
      violations,
      // Regras que a página passou/ficaram incompletas — usadas para amortecer
      // a nota pela cobertura (computeQualityRating).
      passes_count: Array.isArray(results.passes) ? results.passes.length : 0,
      incomplete_count: Array.isArray(results.incomplete) ? results.incomplete.length : 0,
      source: "server",
      error: null,
    };

    if (devMode) {
      payload.detailedViolations = formatDetailedViolations(rawViolations);
    }

    return payload;
  } catch (error) {
    console.warn(`[SENTINELA-AXE] Falha ao auditar ${urlString}:`, error.message);
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
    axeSemaphore.release();
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
