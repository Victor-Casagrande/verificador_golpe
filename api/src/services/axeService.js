const puppeteer = require('puppeteer-core');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const {
  sanitizeViolations,
  formatDetailedViolations
} = require('../utils/axeViolations');

const AXE_TIMEOUT_MS = parseInt(process.env.AXE_TIMEOUT_MS, 10) || 45000;

let browserInstance = null;
let pagesProcessed = 0;
let idleTimeoutId = null;

const MAX_PAGES_PER_BROWSER = 50;
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const isAxeEnabled = () =>
  process.env.NODE_ENV !== 'test' && process.env.AXE_ENABLED !== 'false';

const getExecutablePath = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  return '/usr/bin/chromium';
};

const resetIdleTimeout = () => {
  if (idleTimeoutId) clearTimeout(idleTimeoutId);
  
  idleTimeoutId = setTimeout(async () => {
    console.log('[SENTRY-AXE] Encerrando o navegador Chromium por inatividade (Libertação de RAM).');
    await closeBrowser();
  }, IDLE_TIMEOUT_MS);
};

const getBrowser = async () => {
  if (pagesProcessed >= MAX_PAGES_PER_BROWSER) {
    console.log(`[SENTRY-AXE] Limite de ${MAX_PAGES_PER_BROWSER} análises atingido. A reciclar a instância do Chromium...`);
    await closeBrowser();
  }

  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: getExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    pagesProcessed = 0;
  }

  resetIdleTimeout();
  return browserInstance;
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
      source: 'skipped',
      error: 'Auditoria axe desabilitada neste ambiente.'
    };
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    pagesProcessed++;

    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultNavigationTimeout(AXE_TIMEOUT_MS);

    await page.goto(urlString, {
      waitUntil: 'networkidle2',
      timeout: AXE_TIMEOUT_MS
    });

    const results = await new AxePuppeteer(page).analyze();
    const rawViolations = results.violations || [];
    const violations = sanitizeViolations(rawViolations);

    const payload = {
      violations,
      source: 'server',
      error: null
    };

    if (devMode) {
      payload.detailedViolations = formatDetailedViolations(rawViolations);
    }

    return payload;
  } catch (error) {
    console.warn(`[SENTRY-AXE] Falha ao auditar ${urlString}:`, error.message);
    return {
      violations: [],
      source: 'server',
      error: error.message
    };
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
};

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

module.exports = {
  auditUrl,
  closeBrowser,
  isAxeEnabled,
  sanitizeViolations,
  formatDetailedViolations
};