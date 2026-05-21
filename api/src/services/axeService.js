const puppeteer = require('puppeteer-core');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const {
  sanitizeViolations,
  formatDetailedViolations
} = require('../utils/axeViolations');

/** Tempo máximo (ms) para navegação e análise axe-core via Puppeteer. */
const AXE_TIMEOUT_MS = parseInt(process.env.AXE_TIMEOUT_MS, 10) || 45000;

let browserInstance = null;

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

const getBrowser = async () => {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: getExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
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
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
};

module.exports = {
  auditUrl,
  closeBrowser,
  isAxeEnabled,
  sanitizeViolations,
  formatDetailedViolations
};
