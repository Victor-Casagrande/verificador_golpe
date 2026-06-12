#!/usr/bin/env node
/**
 * Garante um Chrome/Chromium disponível para puppeteer-core.
 *
 * - Docker/Alpine: chromium do sistema (PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true) → no-op
 * - Render nativo: baixa Chrome para api/.cache/puppeteer no npm install
 */

const { execSync } = require("child_process");
const { fileExists, resolveChromiumExecutable } = require("../src/utils/axePagePrep");

if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === "true") {
  process.exit(0);
}

try {
  resolveChromiumExecutable();
  process.exit(0);
} catch {
  /* precisa instalar */
}

console.log("[postinstall] Nenhum Chrome/Chromium no sistema — baixando via Puppeteer…");

try {
  execSync("npx puppeteer browsers install chrome", {
    stdio: "inherit",
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR:
        process.env.PUPPETEER_CACHE_DIR ||
        require("path").join(__dirname, "..", ".cache", "puppeteer"),
    },
  });
  const resolved = resolveChromiumExecutable();
  console.log(`[postinstall] Chrome pronto em: ${resolved}`);
} catch (err) {
  console.warn(
    "[postinstall] Falha ao baixar Chrome:",
    err.message,
    "\nA auditoria axe ficará indisponível até PUPPETEER_EXECUTABLE_PATH ou deploy Docker.",
  );
  process.exit(0);
}
