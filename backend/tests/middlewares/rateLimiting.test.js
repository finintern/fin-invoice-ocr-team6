const request = require('supertest');
const express = require('express');
const apiLimiter = require('../../src/middlewares/rateLimitMiddleware');

// Create test app with the real middleware
const app = express();

// Trust proxy to make X-Forwarded-For work properly in tests
app.set('trust proxy', true);

app.use('/api', apiLimiter);
app.get('/api/test', (req, res) => res.json({ message: 'success' }));

// Reset the rate limiter between tests
beforeEach(() => {
  // Clear any rate limit tracking
  if (apiLimiter.resetKey) {
    apiLimiter.resetKey();
  }
});

describe('Rate Limiting Middleware', () => {
  it('should allow requests within rate limit', async () => {
    // Make 3 requests (matches max limit from production middleware)
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/api/test');
      expect(response.status).toBe(200);
    }
  });

  it('should block requests over rate limit', async () => {
    // Make 3 requests (matches limit)
    for (let i = 0; i < 3; i++) {
      await request(app).get('/api/test');
    }

    // This 4th request should be blocked
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests from this IP, please try again after 15 minutes');
  });

  it('should allow requests from whitelisted IPs', async () => {
    // Reset rate limiter before this test specifically
    if (apiLimiter.resetKey) {
      apiLimiter.resetKey();
    }
    
    // Simulate a whitelisted IP - make sure to use '127.0.0.1' exactly as in whitelist
    const response = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '127.0.0.1');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('success');
  });

  it('should set Retry-After header when rate limit exceeded', async () => {
    // Exhaust the rate limit
    for (let i = 0; i < 4; i++) {
      await request(app).get('/api/test');
    }
    
    // Check if the response has Retry-After header
    const response = await request(app).get('/api/test');
    expect(response.status).toBe(429);
    expect(response.headers).toHaveProperty('retry-after');
    expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
  });
});