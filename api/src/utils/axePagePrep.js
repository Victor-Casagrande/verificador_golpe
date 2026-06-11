/**
 * Preparação da página Puppeteer antes de rodar o axe-core.
 *
 * O erro "Page/Frame is not ready" ocorre quando o axe tenta injetar scripts
 * antes do frame principal estar estável — comum em SPAs e ao usar
 * BrowserContext isolado com `domcontentloaded` apenas.
 */

const fs = require("fs");

/** Resolve o executável do Chromium/Chrome conforme o SO e variáveis de ambiente. */
const resolveChromiumExecutable = () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
          ]
        : [
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/usr/bin/google-chrome",
          ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }

  return candidates[0];
};

/** Configura viewport, timeouts, CSP e bloqueio leve de mídia (mantém CSS/JS). */
const configurePage = async (page, timeoutMs) => {
  await page.setBypassCSP(true);
  await page.setViewport({ width: 1280, height: 720 });
  page.setDefaultNavigationTimeout(timeoutMs);
  page.setDefaultTimeout(timeoutMs);

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    // Bloqueia só mídia pesada — CSS e fontes permanecem para regras de contraste.
    if (["image", "media"].includes(type)) {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });

  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });
};

/** Navega com `networkidle2` e faz fallback para `domcontentloaded`. */
const navigateForAudit = async (page, urlString, timeoutMs) => {
  try {
    await page.goto(urlString, {
      waitUntil: "networkidle2",
      timeout: timeoutMs,
    });
  } catch {
    await page.goto(urlString, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
  }
};

/** Aguarda o documento principal estar pronto para injeção do axe. */
const waitForPageReady = async (page, timeoutMs = 10000) => {
  await page.waitForSelector("body", { timeout: timeoutMs }).catch(() => {});
  await page
    .waitForFunction(
      () =>
        document.readyState === "complete" ||
        document.readyState === "interactive",
      { timeout: timeoutMs },
    )
    .catch(() => {});
  // SPAs costumam hidratar após o readyState; pequena folga determinística.
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});
};

/** Rola a página para carregar iframes com loading="lazy" (causa conhecida de hang). */
const scrollLazyFrames = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 200;
      const timer = setInterval(() => {
        const { scrollHeight } = document.documentElement;
        window.scrollBy(0, distance);
        total += distance;
        if (total >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
      setTimeout(() => {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve();
      }, 4000);
    });
  });
};

const isFrameReadinessError = (error) =>
  /not ready|frame.*detached|execution context/i.test(error?.message || "");

module.exports = {
  resolveChromiumExecutable,
  configurePage,
  navigateForAudit,
  waitForPageReady,
  scrollLazyFrames,
  isFrameReadinessError,
};
