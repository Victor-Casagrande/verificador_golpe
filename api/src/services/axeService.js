const puppeteer = require('puppeteer-core');
const { AxePuppeteer } = require('@axe-core/puppeteer');

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

const sanitizeViolations = (violations) => {
  if (!Array.isArray(violations)) return [];

  return violations.slice(0, 50).map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    helpUrl: violation.helpUrl,
    nodes_count: Array.isArray(violation.nodes) ? violation.nodes.length : 0
  }));
};

/**
 * Executa axe-core na URL via Puppeteer (navegador headless).
 */
const auditUrl = async (urlString) => {
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
    const violations = sanitizeViolations(results.violations);

    return {
      violations,
      source: 'server',
      error: null
    };
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
  sanitizeViolations
};
