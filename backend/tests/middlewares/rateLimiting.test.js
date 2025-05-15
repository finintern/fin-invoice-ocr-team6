const request = require('supertest');
const express = require('express');
const rateLimit = require('express-rate-limit');
const debug = require('debug')('rate-limit');
const WHITELISTED_IPS = ['127.0.0.1']; // Example whitelist

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (req.user && req.user.role === 'admin') {
      return 100; // Higher limit for admins
    }
    return 3; // Default limit
  },
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const clientIp = req.headers['x-forwarded-for'] || req.ip;
    return WHITELISTED_IPS.includes(clientIp);
  },
  handler: (req, res) => {
    debug(`Rate limit exceeded for IP: ${req.ip}`);
    res.setHeader('Retry-After', Math.ceil(req.rateLimit.resetTime / 1000));
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

const app = express();
app.use('/api', apiLimiter);
app.get('/api/test', (req, res) => res.json({ message: 'success' }));

describe('Rate Limiting Middleware', () => {
  it('should allow requests within rate limit', async () => {
    // Make 3 requests (dummy max limit)
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/api/test');
      expect(response.status).toBe(200);
    }
  });

  it('should block requests over rate limit', async () => {
    // Make 4 requests (1 over dummy limit)
    for (let i = 0; i < 4; i++) {
      await request(app).get('/api/test');
    }

    const response = await request(app).get('/api/test');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many requests from this IP, please try again after 15 minutes');
  });

  it('should allow requests from whitelisted IPs', async () => {
    const response = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '127.0.0.1'); // Simulate whitelisted IP
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('success');
  });

});