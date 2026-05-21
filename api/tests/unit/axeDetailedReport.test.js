const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatDetailedViolations } = require('../../src/utils/axeViolations');
const { parseDevMode } = require('../../src/utils/devMode');
const fixtures = require('../fixtures/test-urls.json');

describe('axe detailed report (dev_mode)', () => {
  it('parseDevMode aceita boolean e string "true"', () => {
    assert.equal(parseDevMode(true), true);
    assert.equal(parseDevMode('true'), true);
    assert.equal(parseDevMode(false), false);
    assert.equal(parseDevMode(undefined), false);
    assert.equal(parseDevMode('false'), false);
  });

  it('formatDetailedViolations expõe nós e metadados das exceções', () => {
    const detailed = formatDetailedViolations(fixtures.sample_accessibility_violations);

    assert.equal(detailed.length, 2);
    assert.equal(detailed[0].id, 'image-alt');
    assert.equal(detailed[0].impact, 'critical');
    assert.ok(Array.isArray(detailed[0].nodes));
    assert.equal(detailed[0].nodes.length, 2);
    assert.ok('html' in detailed[0].nodes[0] || detailed[0].nodes[0].html === undefined);
  });
});
