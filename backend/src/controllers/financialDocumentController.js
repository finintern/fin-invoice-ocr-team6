const pdfValidationService = require('../services/pdfValidationService');
const PdfDecryptionService = require('../services/pdfDecryptionService');
const QpdfDecryption = require('../strategies/qpdfDecryption');
const { safeResponse } = require('../utils/responseHelper');
const { ValidationError, AuthError, ForbiddenError, PayloadTooLargeError, UnsupportedMediaTypeError, NotFoundError } = require('../utils/errors');

/**
 * Base controller class for handling financial document operations
 * @class FinancialDocumentController
 */
class FinancialDocumentController {
  /**
   * Creates a new instance of FinancialDocumentController
   * @param {Object} service - The service to use for document operations
   * @param {string} documentType - The type of financial document being processed
   */
  constructor(service, documentType) {
    this.service = service;
    this.documentType = documentType;
      // Initialize PDF decryption service with QPDF strategy
      this.pdfDecryptionService = new PdfDecryptionService(new QpdfDecryption());
  }

  /**
   * Executes a function with a timeout
   * @param {Function} fn - The function to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<any>} The result of the function
   * @throws {Error} If the execution times out or the function throws
   */
  async executeWithTimeout(fn, timeoutMs = process.env.UPLOAD_TIMEOUT || 3000) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    });

    try {
      return await Promise.race([
        fn().finally(() => clearTimeout(timeoutId)),
        timeoutPromise
      ]);
    } catch (error) {
      // Don't log validation errors to console, they're expected errors
      if (!(error instanceof ValidationError)) {
        console.error(error);
      }
      throw error;
    }
  }

  /**
   * Handles file upload requests
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Response with the upload result
   */
  async uploadFile(req, res) {
    try {
      await this.executeWithTimeout(async () => {
        await this.validateUploadRequest(req);
        
        // Check if the file is encrypted
        const validationResult = await this.validateUploadFile(req.file);
        
        // If file is encrypted
        if (validationResult?.isEncrypted) {
          // If password is provided in the request body, try to decrypt
          if (req.body?.password) {
            try {
              // Attempt to decrypt the PDF with the provided password
              const decryptedBuffer = await this.pdfDecryptionService.decrypt(
                validationResult.buffer, 
                req.body.password
              );
              
              // Replace the encrypted buffer with the decrypted one
              req.file.buffer = decryptedBuffer;
              
              // Continue with normal processing using decrypted file
              const result = await this.processUpload(req);
              return safeResponse(res, 200, result);
            } catch (error) {
              // Handle decryption errors
              if (error.message.includes("Incorrect password")) {
                throw new ValidationError("Incorrect password for encrypted PDF");
              }
              throw new ValidationError(`Failed to decrypt PDF: ${error.message}`);
            }
          } else {
            // No password provided, inform client that password is required
            return safeResponse(res, 403, {
              message: "PDF is encrypted and requires a password",
              requiresPassword: true
            });
          }
        }
        
        // Process non-encrypted file normally
        const result = await this.processUpload(req);
        return safeResponse(res, 200, result);
      });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  /**
   * Validates the upload request
   * @param {Object} req - Express request object
   * @throws {AuthError} If user is not authenticated
   * @throws {ValidationError} If no file is uploaded
   */
  async validateUploadRequest(req) {
    if (!req.user) {
      throw new AuthError("Unauthorized");
    }
    if (!req.file) {
      throw new ValidationError("No file uploaded");
    }
  }

  /**
   * Validates the uploaded file
   * @param {Object} file - File object from multer
   * @param {Buffer} file.buffer - File contents
   * @param {string} file.mimetype - File MIME type
   * @param {string} file.originalname - Original filename
   * @returns {Promise<Object>} Validation result with encryption status
   * @throws {ValidationError} If validation fails
   * @throws {UnsupportedMediaTypeError} If file type is not supported
   * @throws {PayloadTooLargeError} If file is too large
   */
  async validateUploadFile(file) {
    const { buffer, mimetype, originalname } = file;
    try {
      const validationResult = await pdfValidationService.allValidations(buffer, mimetype, originalname);
      
      // If PDF is encrypted, store the buffer and return encrypted status
      if (validationResult.isEncrypted) {
        return { isEncrypted: true, buffer, filename: originalname };
      }
      
      return { isEncrypted: false };
    } catch (error) {
      if (error instanceof UnsupportedMediaTypeError || error instanceof PayloadTooLargeError) {
        throw error; 
      }
      throw new ValidationError(error.message);
    } 
  }

  /**
   * Processes the upload based on the document type
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Processing result
   * @throws {Error} Must be implemented by child classes
   */
  async processUpload(_req) {
    throw new Error('processUpload must be implemented by child classes');
  }

  /**
   * Handles errors and sends appropriate HTTP responses
   * @param {Object} res - Express response object
   * @param {Error} error - The error to handle
   * @returns {Object} HTTP response with appropriate status code and message
   */
  handleError(res, error) {
    if (error instanceof ValidationError) {
      // Special case for password errors - don't log these
      if (error.message.includes("Incorrect password for encrypted PDF") || 
          error.message.includes("PDF is encrypted")) {
        // Just send the response without logging
        return safeResponse(res, 400, error.message);
      }
      
      return safeResponse(res, 400, error.message);
    }
    
    if (error instanceof AuthError) {
      return safeResponse(res, 401, error.message);
    }
    if (error instanceof ForbiddenError) {
      return safeResponse(res, 403, error.message);
    }
    if (error instanceof NotFoundError) {
      return safeResponse(res, 404, error.message);
    }
    if (error instanceof PayloadTooLargeError) {
      return safeResponse(res, 413, error.message);
    }
    if (error instanceof UnsupportedMediaTypeError) {
      return safeResponse(res, 415, error.message);
    }
    if (error.message === "Timeout") {
      return safeResponse(res, 504, "Server timeout - upload processing timed out");
    }    
    console.error("Unexpected error:", error);
    return safeResponse(res, 500, "Internal server error");
  }

}

module.exports = FinancialDocumentController;
