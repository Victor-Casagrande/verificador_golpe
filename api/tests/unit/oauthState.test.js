const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'test_oauth_state_secret';

const {
  createOAuthState,
  verifyOAuthState
} = require('../../src/services/oauthService');

describe('oauthService state', () => {
  it('gera e valida state para o provedor correto', () => {
    const state = createOAuthState('github');
    const decoded = verifyOAuthState(state, 'github');
    assert.equal(decoded.provider, 'github');
    assert.equal(decoded.purpose, 'oauth');
  });

  it('rejeita state de outro provedor', () => {
    const state = createOAuthState('google');
    assert.throws(() => verifyOAuthState(state, 'github'));
  });
});
