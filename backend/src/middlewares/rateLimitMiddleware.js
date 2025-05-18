const rateLimit = require('express-rate-limit');
const debug = require('debug')('app:rate-limit');

/**
 * API Rate Limiting Middleware
 * 
 * @description Limits the number of requests that can be made to the API from a single IP address
 * @module middlewares/rateLimitMiddleware
 * 
 * Configuration:
 * - Window: 15 minutes
 * - Maximum requests per window: 3 requests per IP address
 * - Returns 429 (Too Many Requests) when rate limit is exceeded
 * - Includes standard rate limit headers (RateLimit-*) in responses
 * 
 * This middleware helps prevent abuse and ensures fair usage of API resources.
 * The rate limit values can be adjusted based on actual application needs.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests (Subject to change based on actual needs)
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    debug(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

module.exports = apiLimiter;