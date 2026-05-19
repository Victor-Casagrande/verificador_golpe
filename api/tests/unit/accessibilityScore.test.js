const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeAccessibilityScore,
  computeQualityRating
} = require('../../src/utils/accessibilityScore');
const fixtures = require('../fixtures/test-urls.json');

describe('accessibilityScore', () => {
  it('retorna 0 para lista vazia', () => {
    assert.equal(computeAccessibilityScore([]), 0);
    assert.equal(computeAccessibilityScore(null), 0);
  });

  it('pondera impacto e quantidade de nós', () => {
    const score = computeAccessibilityScore(fixtures.sample_accessibility_violations);
    assert.ok(score > 0);
    // critical(4)*2 + serious(3)*1 = 11
    assert.equal(score, 11);
  });

  it('quality_rating é 100 sem violações e diminui com penalty', () => {
    assert.equal(computeQualityRating(0), 100);
    assert.equal(computeQualityRating(11), 89);
    assert.equal(computeQualityRating(150), 0);
  });
});
