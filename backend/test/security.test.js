const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const pool = require('../src/db/pool');

// Mock pool query
jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
}));

// Mock logger to suppress output during tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Security Hardening Tests', () => {
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const PASSWORD = 'gpsinstal2025';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/login', () => {
    it('should allow login with correct credentials', async () => {
      // Mock successful login
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: ADMIN_USER, password: PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject login with incorrect credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: ADMIN_USER, password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Nieprawidłowe dane logowania');
    });

    it('should enforce rate limiting', async () => {
      // Make 6 requests (limit is 5)
      // Note: express-rate-limit keeps state in memory by default, so we can test it directly
      // However, we need to ensure the rate limiter middleware is active.
      // Jest runs in parallel or might reset modules, so we might need multiple calls.
      
      const agent = request.agent(app); // Use agent to persist cookies/IP if needed (though IP comes from req)
      
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          agent.post('/api/admin/login').send({ username: ADMIN_USER, password: 'wrongpassword' })
        );
      }

      const responses = await Promise.all(attempts);
      const tooManyRequests = responses.some(res => res.status === 429);
      
      // If it fails, checks config. express-rate-limit relies on IP. Test environment might have weird IPs.
      // But typically this works.
      if (!tooManyRequests) {
        // Fallback check if rate limit is disabled in test env?
        // Our admin.js doesn't check NODE_ENV for rate limit.
      }
      
      expect(tooManyRequests).toBe(true);
    });
  });

  describe('CSV Export Sanitization', () => {
    let token;

    beforeAll(async () => {
      // Wait for rate limit to reset (if test env windowMs is 1000ms)
      if (process.env.NODE_ENV === 'test') {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }

      // Get auth token
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: ADMIN_USER, password: PASSWORD });
      token = res.body.token;
    });

    it('should sanitize CSV injection characters', async () => {
      // Mock DB response with malicious data
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            created_at: new Date().toISOString(),
            full_name: '=SUM(1+1)',
            email: '+malicious@email.com',
            phone: '-123456789',
            city: '@Warsaw',
            message: 'Normal message',
            ip_address: '127.0.0.1'
          }
        ]
      });

      const response = await request(app)
        .get('/api/admin/requests/export')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.header['content-type']).toContain('text/csv');
      
      const csvContent = response.text;
      
      // Check sanitization
      expect(csvContent).toContain("'=SUM(1+1)");
      expect(csvContent).toContain("'+malicious@email.com");
      expect(csvContent).toContain("'-123456789");
      expect(csvContent).toContain("'@Warsaw");
    });
  });
});
