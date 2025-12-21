const timeout = require('../src/middleware/timeout');
const config = require('../src/config');
const request = require('supertest');
const express = require('express');

describe('DDoS Protection', () => {
  describe('Timeout Middleware', () => {
    let app, server;

    beforeAll(() => {
      app = express();
      app.use(timeout(100)); // 100ms timeout for testing
      app.get('/slow', (req, res) => {
        setTimeout(() => {
          // Don't send anything, just wait
          if (!res.headersSent) res.send('Too late');
        }, 200);
      });
      app.get('/fast', (req, res) => {
        res.send('Fast');
      });
    });

    it('should allow fast requests', async () => {
      const res = await request(app).get('/fast');
      expect(res.status).toBe(200);
    });

    it('should return 503 or close connection on slow requests', async () => {
      try {
        const res = await request(app).get('/slow');
        expect(res.status).toBe(503);
        expect(res.body.message).toBe('Request timeout');
      } catch (err) {
        // Socket hang up is also acceptable for timeout protection
        expect(err.code).toMatch(/ECONNRESET|ECONNREFUSED/);
      }
    });
  });

  describe('Configuration', () => {
    it('should have tightened rate limits', () => {
      expect(config.rateLimitWindowMinutes).toBe(5);
      expect(config.rateLimitMax).toBe(100);
    });
  });
});
