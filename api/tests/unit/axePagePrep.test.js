const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const {
  isFrameReadinessError,
  resolveChromiumExecutable,
  fileExists,
} = require("../../src/utils/axePagePrep");

describe("axePagePrep", () => {
  const originalEnv = process.env.PUPPETEER_EXECUTABLE_PATH;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    } else {
      process.env.PUPPETEER_EXECUTABLE_PATH = originalEnv;
    }
  });

  it("isFrameReadinessError detecta mensagens de frame não pronto", () => {
    assert.equal(
      isFrameReadinessError(new Error("Page/Frame is not ready")),
      true,
    );
    assert.equal(
      isFrameReadinessError(new Error("Frame was detached")),
      true,
    );
    assert.equal(
      isFrameReadinessError(new Error("Execution context was destroyed")),
      true,
    );
    assert.equal(isFrameReadinessError(new Error("timeout")), false);
    assert.equal(isFrameReadinessError(null), false);
  });

  it("ignora PUPPETEER_EXECUTABLE_PATH quando o arquivo não existe", () => {
    process.env.PUPPETEER_EXECUTABLE_PATH = "/usr/bin/chromium-browser-missing";
    try {
      resolveChromiumExecutable();
    } catch (err) {
      assert.match(err.message, /não encontrado|not found/i);
      return;
    }
    const resolved = resolveChromiumExecutable();
    assert.notEqual(resolved, "/usr/bin/chromium-browser-missing");
  });

  it("resolveChromiumExecutable devolve caminho existente ou erro claro", () => {
    const chrome =
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : "/usr/bin/chromium";

    if (fileExists(chrome)) {
      process.env.PUPPETEER_EXECUTABLE_PATH = chrome;
      assert.equal(resolveChromiumExecutable(), chrome);
      return;
    }

    assert.throws(() => resolveChromiumExecutable(), /não encontrado|not found/i);
  });
});
