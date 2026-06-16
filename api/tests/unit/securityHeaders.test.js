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
    const prevNodeEnv = process.env.NODE_ENV;
    const prevAllowLocalhost = process.env.CORS_ALLOW_LOCALHOST;

    process.env.NODE_ENV = 'production';
    process.env.CORS_ALLOW_LOCALHOST = 'false';
    delete require.cache[require.resolve('../../src/config/cors')];
    delete require.cache[require.resolve('../../src/app')];
    const isolatedApp = require('../../src/app');

    const response = await request(isolatedApp)
      .get('/')
      .set('Origin', 'http://site-malicioso.com');

    process.env.NODE_ENV = prevNodeEnv;
    if (prevAllowLocalhost === undefined) delete process.env.CORS_ALLOW_LOCALHOST;
    else process.env.CORS_ALLOW_LOCALHOST = prevAllowLocalhost;
    delete require.cache[require.resolve('../../src/config/cors')];
    delete require.cache[require.resolve('../../src/app')];

    assert.equal(response.status, 200);
    assert.notEqual(
      response.headers['access-control-allow-origin'],
      'http://site-malicioso.com',
      'Origem maliciosa não deve receber access-control-allow-origin',
    );
  });
});
