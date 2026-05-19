const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateUrl } = require('../../src/utils/validators');
const fixtures = require('../fixtures/test-urls.json');

describe('validators', () => {
  it('aceita http e https válidos', () => {
    for (const url of fixtures.safe) {
      assert.equal(validateUrl(url), true, url);
    }
  });

  it('rejeita protocolos não web e strings inválidas', () => {
    for (const url of fixtures.invalid) {
      assert.equal(validateUrl(url), false, url);
    }
  });
});
