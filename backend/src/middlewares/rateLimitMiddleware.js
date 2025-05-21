const rateLimit = require('express-rate-limit');
const debug = require('debug')('app:rate-limit');
const Sentry = require('../instrument');

// List of whitelisted IPs
const WHITELISTED_IPS = ['127.0.0.1', '192.168.1.100'];

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    return 3; // Default limit
  },
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Get IP from various sources (X-Forwarded-For or actual IP)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
    
    // Skip rate limiting for whitelisted IPs
    const isWhitelisted = WHITELISTED_IPS.includes(clientIp);
    
    if (isWhitelisted) {
      debug(`Skipping rate limit for whitelisted IP: ${clientIp}`);
    }
    
    return isWhitelisted;
  },
  handler: (req, res) => {
    debug(`Rate limit exceeded for IP: ${req.ip}`);

    // Send response with Retry-After header
    res.setHeader('Retry-After', Math.ceil(req.rateLimit.resetTime / 1000));
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

module.exports = apiLimiter;