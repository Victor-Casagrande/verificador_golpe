const cron = require('node-cron');
const pool = require('../../src/config/database');
const { scheduleCleanup } = require('../../src/jobs/dbCleanup');
const logger = require('../../src/utils/logger');

jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

jest.mock('../../src/config/database', () => ({
  connect: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('Cron Cleanup Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute cleanup queries sequentially and commit', async () => {
    const clientMock = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(clientMock);

    scheduleCleanup();

    // Verify if cron.schedule was called
    expect(cron.schedule).toHaveBeenCalledWith('0 3 * * *', expect.any(Function));

    // Get the callback passed to cron.schedule
    const cronCallback = cron.schedule.mock.calls[0][1];

    // Execute the callback manually
    await cronCallback();

    // Verification of db operations
    expect(pool.connect).toHaveBeenCalled();
    expect(clientMock.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    
    // Test the specific queries
    expect(clientMock.query).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE FROM url_analyses'));
    expect(clientMock.query).toHaveBeenNthCalledWith(3, expect.stringContaining('DELETE FROM jwt_blacklist WHERE expires_at < NOW()'));
    expect(clientMock.query).toHaveBeenNthCalledWith(4, expect.stringContaining('DELETE FROM users'));
    expect(clientMock.query.mock.calls[3][0]).toContain('AND id NOT IN (SELECT DISTINCT user_id FROM reports)');

    expect(clientMock.query).toHaveBeenNthCalledWith(5, 'COMMIT');
    expect(clientMock.release).toHaveBeenCalled();
  });

  it('should rollback transaction on error', async () => {
    const errorMsg = 'Database error';
    const clientMock = {
      query: jest.fn().mockImplementation((query) => {
        if (query === 'BEGIN' || query === 'ROLLBACK') return Promise.resolve();
        return Promise.reject(new Error(errorMsg));
      }),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(clientMock);

    scheduleCleanup();
    
    const cronCallback = cron.schedule.mock.calls[0][1];
    await cronCallback();

    expect(clientMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(clientMock.release).toHaveBeenCalled();
  });
});
