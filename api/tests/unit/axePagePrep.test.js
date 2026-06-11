const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isFrameReadinessError,
  resolveChromiumExecutable,
} = require("../../src/utils/axePagePrep");

describe("axePagePrep", () => {
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

  it("resolveChromiumExecutable devolve string não vazia", () => {
    const path = resolveChromiumExecutable();
    assert.equal(typeof path, "string");
    assert.ok(path.length > 0);
  });
});
