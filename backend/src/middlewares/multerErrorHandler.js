const multer = require('multer');

/**
 * Multer Error Handling Middleware
 * 
 * @description Handles errors thrown by Multer during file upload operations
 * @param {Error} err - The error object passed from previous middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} If the error is from Multer, returns a JSON response with appropriate status code
 * @returns {Function} If the error is not from Multer, passes it to the next error handler
 * 
 * Specific error codes handled:
 * - LIMIT_FILE_SIZE: Returns 413 status code when file size exceeds the limit (20MB)
 * - Other Multer errors: Returns 400 status code with the error message
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File size exceeds 20MB limit'
      });
    }
    return res.status(400).json({ 
      message: `Upload error: ${err.message}`
    });
  }
  next(err);
};

module.exports = handleMulterError;