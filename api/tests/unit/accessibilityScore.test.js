const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeAccessibilityScore,
  computeQualityRating,
  computeCoverageDamping,
  nodeFactor,
  NODE_CAP_FACTOR,
} = require("../../src/utils/accessibilityScore");
const fixtures = require("../fixtures/test-urls.json");

describe("accessibilityScore", () => {
  it("retorna 0 para lista vazia", () => {
    assert.equal(computeAccessibilityScore([]), 0);
    assert.equal(computeAccessibilityScore(null), 0);
  });

  it("pondera impacto com retornos decrescentes por nós", () => {
    // image-alt (critical, 2 nós) = 10 * (1 + log2(2)) = 20
    // color-contrast (serious, 1 nó) = 5 * 1 = 5
    const score = computeAccessibilityScore(
      fixtures.sample_accessibility_violations,
    );
    assert.equal(score, 25);
  });

  it("nodeFactor satura no teto para problemas muito repetidos", () => {
    assert.equal(nodeFactor(1), 1);
    assert.equal(nodeFactor(2), 2);
    assert.ok(nodeFactor(1000) <= NODE_CAP_FACTOR);
    assert.equal(nodeFactor(1000), NODE_CAP_FACTOR);
  });

  it("uma única regra repetida não domina a nota (teto por regra)", () => {
    const muitosNos = [
      { impact: "serious", nodes_count: 500 },
    ];
    const score = computeAccessibilityScore(muitosNos);
    // 5 * NODE_CAP_FACTOR(4) = 20, e não 5 * 500 = 2500
    assert.equal(score, 5 * NODE_CAP_FACTOR);
  });

  it("quality_rating é 100 sem violações", () => {
    assert.equal(computeQualityRating(0), 100);
    assert.equal(computeQualityRating(null), 100);
  });

  it("quality_rating decai de forma suave (curva exponencial)", () => {
    // 100 * e^(-25/150) ≈ 84.6 → 85
    assert.equal(computeQualityRating(25), 85);
  });

  it("quality_rating NUNCA zera no grito para penalidades altas", () => {
    const rating = computeQualityRating(300);
    assert.ok(rating > 0, "penalidade alta ainda deve render nota > 0");
    assert.ok(rating < 20, "mas deve ser uma nota baixa");
  });

  it("amortecimento por cobertura eleva a nota de sites que passam a maioria das regras", () => {
    const semCobertura = computeQualityRating(25);
    const comCobertura = computeQualityRating(25, {
      violationsCount: 2,
      passesCount: 48,
    });
    assert.ok(
      comCobertura > semCobertura,
      "passar muitas regras deve aumentar a nota",
    );
    assert.equal(comCobertura, 93);
  });

  it("computeCoverageDamping respeita os limites [min, 1]", () => {
    // sem dados de passes → sem desconto
    assert.equal(computeCoverageDamping(5, 0), 1);
    // falha em todas as regras → sem desconto
    assert.equal(computeCoverageDamping(10, 0), 1);
    // passa quase tudo → desconto próximo do mínimo
    const damping = computeCoverageDamping(1, 99);
    assert.ok(damping >= 0.4 && damping < 0.5);
  });
});
