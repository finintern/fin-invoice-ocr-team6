const authService = require('../services/authService');
const Sentry = require("../instrument");

/**
 * Authentication Middleware
 * 
 * @description Validates client credentials from request headers
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.client_id - Client ID for authentication
 * @param {string} req.headers.client_secret - Client secret for authentication
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} If authentication fails, returns a JSON response with appropriate status code
 * @returns {Function} If authentication succeeds, calls next() to proceed to the next middleware
 * 
 * @throws {Error} If there's an internal server error during authentication
 */
module.exports = async (req, res, next) => {
  try {
    // Extract client_id and client_secret from headers
    const { client_id, client_secret } = req.headers;

    Sentry.addBreadcrumb({
      category: 'auth',
      message: `Authentication attempt for client_id: ${client_id}`,
      level: 'info'
    });

    // 1. Ensure credentials are present
    if (!client_id || !client_secret) {
      return res.status(401).json({ message: 'Unauthorized: Missing credentials' });
    }

    // 2. Call authService to check credentials in the database
    const partner = await authService.authenticate(client_id, client_secret);
    if (!partner) {
      return res.status(401).json({ message: 'Unauthorized: Invalid credentials' });
    }

    // 3. Store partner uuid in req.user
    req.user = partner;

    Sentry.setUser({ id: partner.uuid });
    next();

  } catch (error) {
    console.error('Error in authMiddleware:', error);

    Sentry.captureException(error, {
      extra: {
        client_id: req.headers.client_id,
        path: req.path
      }
    });

    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
