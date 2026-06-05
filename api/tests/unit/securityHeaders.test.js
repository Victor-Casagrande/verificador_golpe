const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');

describe('Security Headers & CORS Middleware', () => {
  it('Cenário A: Requisição com cabeçalho Origin: chrome-extension://abcdefghijklmnop', async () => {
    const response = await request(app)
      .get('/') // Using root endpoint
      .set('Origin', 'chrome-extension://abcdefghijklmnop');

    // Should pass successfully (no CORS error)
    assert.notEqual(response.status, 500, 'CORS deve permitir origens permitidas sem lançar erro 500');
    assert.equal(response.status, 200, 'O status esperado da rota root é 200');

    // Verify Helmet security headers
    assert.ok(response.headers['x-frame-options'], 'Cabeçalho x-frame-options ausente (Helmet não aplicou)');
    assert.equal(response.headers['x-frame-options'], 'SAMEORIGIN');
    assert.ok(response.headers['content-security-policy'], 'Cabeçalho content-security-policy ausente');
    
    // Verify CORS allowed it
    assert.equal(response.headers['access-control-allow-origin'], 'chrome-extension://abcdefghijklmnop');
  });

  it('Cenário B: Requisição com cabeçalho Origin: http://site-malicioso.com', async () => {
    const response = await request(app)
      .get('/')
      .set('Origin', 'http://site-malicioso.com');

    // Expecting CORS error. Express default error handler returns 500 for unhandled errors
    assert.equal(response.status, 500, 'Origem maliciosa deve ser barrada pelo CORS (erro 500)');
    // The global error handler masks the error message, so we just check it's an internal server error
    assert.match(response.text, /Ocorreu um erro interno no servidor/);
  });
});
