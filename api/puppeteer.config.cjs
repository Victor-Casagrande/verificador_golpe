const { join } = require("path");

/**
 * Cache do Chrome dentro do projeto — necessário no Render (e similares),
 * onde $HOME/.cache não persiste entre build e runtime.
 *
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
