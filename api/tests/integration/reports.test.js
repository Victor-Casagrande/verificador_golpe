const { describe, it, mock } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const reportRepository = require('../../src/repositories/reportRepository');
const userRepository = require('../../src/repositories/userRepository');

describe('Integration Tests - Reports Routes', () => {
  const mockUserId = 1;
  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_in_production';
  // Note: authMiddleware expects decoded.sub for the user ID
  const validToken = jwt.sign({ sub: mockUserId }, jwtSecret, { expiresIn: '1h' });

  it('Cenário C (Validação): Enviar um POST para /reports com o JWT, mas sem o campo url no body. A validação deve retornar 400', async () => {
    const mockUser = { id: mockUserId, email: 'test@example.com' };
    mock.method(userRepository, 'findById', async () => mockUser);

    const res = await request(app)
      .post('/reports')
      .set('Authorization', 'Bearer ' + validToken)
      .send({ report_type: 'phishing' });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.erro || res.body.message || JSON.stringify(res.body), /URL e report_type são obrigatórios/);
  });

  it('Cenário D (Persistência): Enviar um POST válido. Faça o "Mock" do reportRepository.create', async () => {
    const mockReport = { 
      id: 1, 
      user_id: mockUserId, 
      url: 'http://malicious.com', 
      report_type: 'confirmed_scam' 
    };
    
    const createSpy = mock.method(reportRepository, 'create', async () => mockReport);

    const res = await request(app)
      .post('/reports')
      .set('Authorization', 'Bearer ' + validToken)
      .send({ url: 'http://malicious.com', report_type: 'confirmed_scam' });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.sucesso, true);
    
    // Validate repository was called with correct user_id extracted from JWT
    assert.strictEqual(createSpy.mock.callCount(), 1);
    const callArgs = createSpy.mock.calls[0].arguments[0];
    assert.strictEqual(callArgs.userId, mockUserId);
    assert.strictEqual(callArgs.url, 'http://malicious.com');
    assert.strictEqual(callArgs.reportType, 'confirmed_scam');
  });
});
