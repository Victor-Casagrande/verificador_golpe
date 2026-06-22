const { describe, it, mock } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const historyRepository = require('../../src/repositories/historyRepository');
const userRepository = require('../../src/repositories/userRepository');

describe('Integration Tests - History Routes', () => {
  const mockUserId = 1;
  const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_in_production';
  // Note: authMiddleware expects decoded.sub for the user ID
  const validToken = jwt.sign({ sub: mockUserId }, jwtSecret, { expiresIn: '1h' });

  it('Cenário A (Segurança): Tentar acessar o GET /users/history sem o cabeçalho de Authorization. Deve falhar com 401.', async () => {
    const res = await request(app).get('/users/history');
    assert.strictEqual(res.status, 401);
  });

  it('Cenário B (Sucesso): Injetar o JWT via Authorization e fazer o "Mock" do historyRepository.findByUserId', async () => {
    const mockUser = { id: mockUserId, email: 'test@example.com' };
    mock.method(userRepository, 'findById', async () => mockUser);
    
    const mockHistory = [{ 
      id: 1, 
      url: 'http://example.com', 
      accessibility_score: 95, 
      quality_rating: 90, 
      status: 'completed',
      accessibility_violations: [] 
    }];
    
    mock.method(historyRepository, 'findByUserId', async () => mockHistory);
    mock.method(historyRepository, 'countStatsByUserId', async () => ({ total: 1, safe: 1, danger: 0 }));

    const res = await request(app)
      .get('/users/history')
      .set('Authorization', 'Bearer ' + validToken);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.sucesso, true);
    assert.strictEqual(res.body.total, 1);
    assert.strictEqual(res.body.items.length, 1);
    assert.strictEqual(res.body.items[0].url, 'http://example.com');
  });
});
