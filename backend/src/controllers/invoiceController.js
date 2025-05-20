const FinancialDocumentController = require('./financialDocumentController');
const Sentry = require("../instrument");
const { ValidationError, AuthError, ForbiddenError } = require('../utils/errors');
const { from, of, EMPTY, throwError } = require('rxjs');
const { catchError, mergeMap, tap, switchMap, map} = require('rxjs/operators');
const InvoiceLogger = require('../services/invoice/invoiceLogger');

class InvoiceController extends FinancialDocumentController {
  /**
   * @param {Object} dependencies - Controller dependencies
   * @param {Object} dependencies.invoiceService - Service for invoice operations
   * @param {Object} dependencies.validateDeletionService - Service for validation deletion
   * @param {Object} dependencies.s3Service - Service for file s3 operations
   */
  constructor(dependencies = {}) {  // Add default empty object here
    if (!dependencies.invoiceService || typeof dependencies.invoiceService.uploadInvoice !== 'function') {
      throw new Error('Invalid invoice service provided');
    }

    super(dependencies.invoiceService, "Invoice");

    this.validateDeletionService = dependencies.validateDeletionService;
    this.s3Service = dependencies.s3Service;

    // Bind methods to ensure correct context
    this.uploadInvoice = this.uploadInvoice.bind(this);
    this.getInvoiceById = this.getInvoiceById.bind(this);
    this.deleteInvoiceById = this.deleteInvoiceById.bind(this);
    this.getInvoiceStatus = this.getInvoiceStatus.bind(this);
    this.validateGetRequest = this.validateGetRequest.bind(this);
  }

  /**
   * Handles file upload for invoices
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} Response with upload result
   */
  async uploadInvoice(req, res) {
    return await this.uploadFile(req, res);
  }

  /**
   * Processes the invoice file upload
   * @param {Object} req - Express request object
   * @param {Object} req.file - Uploaded file information
   * @param {Buffer} req.file.buffer - File contents as buffer
   * @param {string} req.file.originalname - Original filename
   * @param {string} req.file.mimetype - File MIME type
   * @param {Object} req.user - Authenticated user information
   * @param {string} req.user.uuid - Partner's unique identifier
   * @param {Object} req.body - Request body parameters
   * @returns {Promise<Object>} Upload result containing invoice ID and status
   * @throws {Error} If upload processing fails
   */
  async processUpload(req) {
    const { buffer, originalname, mimetype } = req.file;
    const partnerId = req.user.uuid;
    
    // Fix the skipAnalysis check to handle parameter name with spaces
    let skipAnalysis = false;
    
    // Check req.body exists and is an object
    if (req.body && typeof req.body === 'object') {
      // Look for any parameter that matches skipAnalysis (case insensitive, allowing for spaces)
      Object.keys(req.body).forEach(key => {
        const normalizedKey = key.trim().toLowerCase();
        if (normalizedKey === 'skipanalysis' && req.body[key] === 'true') {
          skipAnalysis = true;
        }
      });
    }

    console.log("Skip analysis parameter detected:", skipAnalysis);

    Sentry.addBreadcrumb({
      category: 'upload',
      message: 'Starting invoice upload process',
      data: {
        filename: originalname,
        partnerId,
        fileSize: buffer.length,
        skipAnalysis
      }
    });

    try {
      const result = await this.service.uploadInvoice({
        buffer,
        originalname,
        mimetype,
        partnerId
      }, skipAnalysis);

      Sentry.captureMessage('Invoice upload successful', {
        level: 'info',
        extra: {
          invoiceId: result.invoiceId,
          partnerId,
          skipAnalysis
        }
      });

      return result;
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          filename: originalname,
          partnerId,
          fileSize: buffer.length,
          skipAnalysis
        }
      });
      throw error;
    }
  }

  /**
   * Retrieves an invoice by its ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Invoice ID
   * @param {Object} req.user - Authenticated user information
   * @param {Object} res - Express response object
   * @returns {void} Response is handled in the observable subscription
   */
  getInvoiceById(req, res) {
    const { id } = req.params;
    
    from(this.validateGetRequest(req, id)).pipe(
      switchMap(() => from(this.service.getInvoiceById(id))),
      map((invoiceDetail) => {
        if (!invoiceDetail) {
          InvoiceLogger.logRetrievalError(id, new Error("Invoice not found"), 'NOT_FOUND');
          return res.status(404).json({ message: "Invoice not found" });
        }
        return res.status(200).json(invoiceDetail);
      }),
      catchError((error) => {
        InvoiceLogger.logRetrievalError(id, error, 'CONTROLLER_ERROR');
        this.handleError(res, error);
        return EMPTY; 
      })
    ).subscribe();
  }

  /**
   * Validates the request to fetch an invoice
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user information
   * @param {string} req.user.uuid - User's unique identifier
   * @param {string} id - Invoice ID to validate
   * @throws {AuthError} If user is not authenticated
   * @throws {ValidationError} If invoice ID is missing
   * @throws {ForbiddenError} If user doesn't have access to the invoice
   * @returns {Promise<void>}
   */
  async validateGetRequest(req, id) {
    if (!req.user) {
      throw new AuthError("Unauthorized");
    }
    if (!id) {
      throw new ValidationError("Invoice ID is required");
    }
    
    const invoicePartnerId = await this.service.getPartnerId(id);
    if (invoicePartnerId !== req.user.uuid) {
      throw new ForbiddenError("Forbidden: You do not have access to this invoice");
    }
  }

  /**
   * @description Retrieves only the status of an invoice by ID
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<Object>} JSON with invoice ID and status
   */
  async getInvoiceStatus(req, res) {
    const { id } = req.params;
    try {
      InvoiceLogger.logProcessingStart(id); 

      await this.validateGetRequest(req, id);

      const statusResult = await this.service.getInvoiceStatus(id);

      InvoiceLogger.logProcessingComplete(id); 
      return res.status(200).json(statusResult);
    } catch (error) {
      InvoiceLogger.logError(id, error, 'GET_INVOICE_STATUS_CONTROLLER'); 
      return this.handleError(res, error);
    }
  }


  /**
   * Deletes an invoice by its ID
   * @param {Object} req - Express request object
   * @param {Object} req.params - URL parameters
   * @param {string} req.params.id - Invoice ID to delete
   * @param {Object} req.user - Authenticated user information
   * @param {string} req.user.uuid - User's unique identifier
   * @param {Object} res - Express response object
   * @returns {void} Response is handled in the observable subscription
   */
  deleteInvoiceById(req, res) {
    const { id } = req.params;
    const partnerId = req.user.uuid;
  
    Sentry.addBreadcrumb({
      category: 'invoiceDeletion',
      message: `Partner ${partnerId} attempting to delete invoice ${id}`,
      level: 'info',
    });
  
    InvoiceLogger.logDeletionStart(id, partnerId);
  
    from(validateDeletion.validateInvoiceDeletion(partnerId, id))
      .pipe(
        mergeMap(invoice => {
          if (invoice.file_url) {
            const fileKey = invoice.file_url.split('/').pop();
            return from(s3Service.deleteFile(fileKey)).pipe(
              mergeMap(deleteResult => {
                if (!deleteResult.success) {
                  const err = new Error('Failed to delete file from S3');
                  InvoiceLogger.logDeletionError(id, err, 'DELETE_S3');
                  Sentry.captureException(err);
                  return throwError(() => ({
                    status: 500,
                    message: err.message,
                    error: deleteResult.error,
                  }));
                }
  
                InvoiceLogger.logS3DeletionSuccess(id, fileKey);
                return of(invoice);
              })
            );
          }
          return of(invoice);
        }),
  
        mergeMap(() => InvoiceService.deleteInvoiceById(id)),
  
        tap(() => {
          InvoiceLogger.logDeletionSuccess(id, partnerId);
          Sentry.captureMessage(`Invoice ${id} successfully deleted by ${partnerId}`);
        }),
  
        catchError(error => {
          InvoiceLogger.logDeletionError(id, error, 'DELETE_CONTROLLER');
          Sentry.captureException(error);
  
          if (error.message === 'Invoice not found') {
            return of({ status: 404, message: error.message });
          }
          if (error.message === 'Unauthorized: You do not own this invoice') {
            return of({ status: 403, message: error.message });
          }
          if (error.message === 'Invoice cannot be deleted unless it is Analyzed') {
            return of({ status: 409, message: error.message });
          }
  
          return of({ status: 500, message: 'Internal server error' });
        })
      )
      .subscribe({
        next: result => {
          if (result.status) {
            return res
              .status(result.status)
              .json({ message: result.message, error: result.error });
          }
          return res.status(200).json({ message: 'Invoice successfully deleted' });
        },
      });
  }
  
}

/**
 * Invoice service for handling invoice operations
 * @type {Object}
 */
const InvoiceService = require('../services/invoice/invoiceService');

/**
 * Service for validating invoice deletion
 * @type {Object}
 */
const validateDeletion = require('../services/validateDeletion');

/**
 * S3 service for file operations
 * @type {Object}
 */
const s3Service = require('../services/s3Service');

/**
 * Pre-configured invoice controller instance
 * @type {InvoiceController}
 */
const controller = new InvoiceController({
  invoiceService: InvoiceService,
  validateDeletionService: validateDeletion,
  s3Service: s3Service
});

module.exports = {
  InvoiceController,  // Export the class for testing
  controller         // Export instance for routes
};