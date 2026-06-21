/**
 * Preparação da página Puppeteer antes de rodar o axe-core.
 *
 * O erro "Page/Frame is not ready" ocorre quando o axe tenta injetar scripts
 * antes do frame principal estar estável — comum em SPAs e ao usar
 * BrowserContext isolado com `domcontentloaded` apenas.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const fileExists = (candidate) => {
  if (!candidate) return false;
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  }
};

const LINUX_CANDIDATES = [
  "/usr/lib/chromium/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
];

/** Resolve via PATH do container (útil no Alpine/Docker). */
const resolveViaPath = () => {
  try {
    const bin = execSync("command -v chromium-browser chromium 2>/dev/null", {
      encoding: "utf8",
      shell: "/bin/sh",
    })
      .trim()
      .split("\n")[0];
    if (fileExists(bin)) return bin;
  } catch {
    /* ignore */
  }
  return null;
};

const scanCandidates = (candidates) => {
  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }
  return null;
};

/** Chrome baixado em api/.cache/puppeteer (Render Node nativo). */
const resolvePuppeteerCacheChrome = () => {
  const cacheRoots = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(process.cwd(), ".cache", "puppeteer"),
  ].filter(Boolean);

  for (const root of cacheRoots) {
    const chromeDir = path.join(root, "chrome");
    if (!fileExists(chromeDir)) continue;

    try {
      for (const platformDir of fs.readdirSync(chromeDir)) {
        const linux = path.join(chromeDir, platformDir, "chrome-linux64", "chrome");
        if (fileExists(linux)) return linux;

        const mac = path.join(
          chromeDir,
          platformDir,
          "chrome-mac-x64",
          "Google Chrome for Testing.app",
          "Contents",
          "MacOS",
          "Google Chrome for Testing",
        );
        if (fileExists(mac)) return mac;

        const win = path.join(chromeDir, platformDir, "chrome-win64", "chrome.exe");
        if (fileExists(win)) return win;
      }
    } catch {
      /* ignore */
    }
  }

  return null;
};

/** Tenta o Chrome baixado pelo pacote `puppeteer` (deploy Render sem Docker). */
const resolvePuppeteerBundledChrome = () => {
  try {
    const puppeteer = require("puppeteer");
    const bundled = puppeteer.executablePath();
    if (fileExists(bundled)) return bundled;
  } catch {
    /* puppeteer não instalado ou Chrome ainda não baixado */
  }
  return null;
};

/**
 * Resolve o executável do Chromium/Chrome conforme SO, variáveis de ambiente
 * e cache do Puppeteer (Render/Heroku).
 *
 * PUPPETEER_EXECUTABLE_PATH só é usado se o arquivo existir — evita 500 quando
 * a variável aponta para um caminho legado (ex.: /usr/bin/chromium-browser no Alpine).
 */
const resolveChromiumExecutable = () => {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && fileExists(envPath)) {
    return envPath;
  }

  const platformCandidates =
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
        : LINUX_CANDIDATES;

  const fromScan = scanCandidates(platformCandidates);
  if (fromScan) return fromScan;

  if (process.platform === "linux") {
    const fromPath = resolveViaPath();
    if (fromPath) return fromPath;
  }

  const fromCache = resolvePuppeteerCacheChrome();
  if (fromCache) return fromCache;

  const fromPuppeteer = resolvePuppeteerBundledChrome();
  if (fromPuppeteer) return fromPuppeteer;

  if (envPath) {
    throw new Error(
      `Browser was not found at the configured executablePath (${envPath}). ` +
        "No Alpine/Linux, use /usr/bin/chromium. No Render nativo, remova " +
        "PUPPETEER_EXECUTABLE_PATH ou defina PUPPETEER_CACHE_DIR e rode " +
        "`npx puppeteer browsers install chrome` no build.",
    );
  }

  throw new Error(
    "Chromium/Chrome não encontrado. Instale o navegador no sistema, defina " +
      "PUPPETEER_EXECUTABLE_PATH com um caminho válido ou use o deploy Docker " +
      "(apk add chromium).",
  );
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
    // Bloqueia mídia, imagens, fontes, websockets, fetch/xhr (se não for documento).
    // O Axe precisa avaliar o DOM, mas num ambiente restrito de RAM podemos bloquear o máximo possível.
    if (
      ["image", "media", "font", "websocket", "manifest", "texttrack", "eventsource"].includes(type)
    ) {
      req.abort().catch(() => {});
    } else if (req.isInterceptResolutionHandled && req.isInterceptResolutionHandled()) {
      return;
    } else {
      req.continue().catch(() => {});
    }
  });

  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });
};

/** Navega esperando recursos principais; tolera timeout se a URL já carregou parcialmente. */
const navigateForAudit = async (page, urlString, timeoutMs) => {
  try {
    await page.goto(urlString, {
      waitUntil: "load",
      timeout: timeoutMs,
    });
  } catch (navError) {
    const currentUrl = page.url();
    if (!currentUrl || currentUrl === "about:blank") {
      throw navError;
    }
  }
};

/**
 * O @axe-core/puppeteer exige readyState === "complete" em cada frame (assertFrameReady).
 * Nossa preparação anterior aceitava "interactive", o que disparava o erro cedo demais.
 */
const waitForMainFrameComplete = async (page, timeoutMs = 10000) => {
  await page.waitForSelector("body", { timeout: timeoutMs }).catch(() => {});

  const reachedComplete = await page
    .waitForFunction(() => document.readyState === "complete", {
      timeout: timeoutMs,
    })
    .then(() => true)
    .catch(() => false);

  if (!reachedComplete) {
    // SPAs e portais de notícia (ex.: g1.globo.com) mantêm requests de ads/analytics
    // abertos e nunca atingem "complete". Cancelar loads pendentes destrava o axe.
    await page
      .evaluate(() => {
        if (document.readyState !== "complete") {
          window.stop();
        }
      })
      .catch(() => {});

    await page
      .waitForFunction(() => document.readyState === "complete", {
        timeout: 3000,
      })
      .catch(() => {});
  }

  await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 }).catch(() => {});
};

/** Força iframes lazy a carregar — causa #1 de "Page/Frame is not ready" no axe. */
const ensureLazyIframesLoaded = async (page) => {
  await page
    .evaluate(() => {
      for (const iframe of document.querySelectorAll('iframe[loading="lazy"]')) {
        iframe.loading = "eager";
      }
    })
    .catch(() => {});

  await scrollLazyFrames(page);

  await page
    .evaluate(() => {
      for (const iframe of document.querySelectorAll("iframe")) {
        try {
          iframe.scrollIntoView({ block: "center", behavior: "instant" });
        } catch {
          /* iframe cross-origin ou removido */
        }
      }
    })
    .catch(() => {});

  await new Promise((resolve) => setTimeout(resolve, 400));
};

/** Preparação completa antes da primeira chamada ao axe-core. */
const preparePageForAxeAudit = async (page, timeoutMs = 10000) => {
  await waitForMainFrameComplete(page, timeoutMs);
  await ensureLazyIframesLoaded(page);
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
  waitForMainFrameComplete,
  ensureLazyIframesLoaded,
  preparePageForAxeAudit,
  scrollLazyFrames,
  isFrameReadinessError,
  fileExists,
};
