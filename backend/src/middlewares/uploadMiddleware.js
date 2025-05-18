const multer = require('multer');

/**
 * File Upload Middleware
 * 
 * @description Handles file uploads using Multer with memory storage
 * @module middlewares/uploadMiddleware
 * 
 * Configuration:
 * - Uses memory storage for temporary file handling
 * - Maximum file size: 20MB
 * - Expects a single file with the field name 'file'
 * 
 * Error handling:
 * - Returns 413 status for files exceeding size limit
 * - Returns 400 status for other Multer-related errors
 * - Passes other errors to the next error handler
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Function} Multer middleware configured for file uploads
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
}).single('file');

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          message: 'File size exceeds 20MB limit'
        });
      }
      return res.status(400).json({ 
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return next(err);
    }
    next();
  });
};