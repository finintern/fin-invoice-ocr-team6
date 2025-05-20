const BaseLogger = require('./BaseLogger');

/**
 * InvoiceLogger - Specialized logger for invoice-related events
 * Implements the Singleton pattern for a consistent logger instance
 * and extends the BaseLogger with invoice-specific logging methods
 */
class InvoiceLogger extends BaseLogger {
  /**
   * Create a new InvoiceLogger instance
   * @private - Use getInstance() instead
   */
  constructor() {
    super('invoice-service', 'invoice');
  }

  /**
   * Get the singleton instance of InvoiceLogger
   * @returns {InvoiceLogger} The singleton instance
   */
  static getInstance() {
    if (!InvoiceLogger.instance) {
      InvoiceLogger.instance = new InvoiceLogger();
    }
    return InvoiceLogger.instance;
  }

  /**
   * Log when an invoice upload is initiated
   * @param {string} invoiceId - The ID of the invoice
   * @param {string} partnerId - The ID of the partner uploading the invoice
   * @param {string} filename - The name of the uploaded file
   */
  logUploadStart(invoiceId, partnerId, filename) {
    const metadata = this.createMetadata({ invoiceId, partnerId, filename }, 'UPLOAD_START');
    this.info('Invoice upload initiated', metadata);
  }

  /**
   * Log when an invoice is successfully uploaded to S3
   * @param {string} invoiceId - The ID of the invoice
   * @param {string} s3Url - The S3 URL where the invoice is stored
   */
  logUploadSuccess(invoiceId, s3Url) {
    const metadata = this.createMetadata({ invoiceId, s3Url }, 'UPLOAD_SUCCESS');
    this.info('Invoice uploaded to S3', metadata);
  }

  /**
   * Log when invoice processing starts
   * @param {string} invoiceId - The ID of the invoice
   */
  logProcessingStart(invoiceId) {
    const metadata = this.createMetadata({ invoiceId }, 'PROCESSING_START');
    this.info('Starting invoice processing', metadata);
  }

  /**
   * Log when invoice analysis is completed
   * @param {string} invoiceId - The ID of the invoice
   * @param {string} jsonUrl - The URL to the analysis JSON
   */
  logAnalysisComplete(invoiceId, jsonUrl) {
    const metadata = this.createMetadata({ invoiceId, jsonUrl }, 'ANALYSIS_COMPLETE');
    this.info('Invoice analysis completed', metadata);
  }

  /**
   * Log when invoice data mapping is completed
   * @param {string} invoiceId - The ID of the invoice
   * @param {Object} dataSummary - Summary of mapped data
   */
  logDataMappingComplete(invoiceId, dataSummary) {
    const metadata = this.createMetadata({ invoiceId, dataSummary }, 'MAPPING_COMPLETE');
    this.info('Invoice data mapping completed', metadata);
  }

  /**
   * Log when invoice processing is completed
   * @param {string} invoiceId - The ID of the invoice
   */
  logProcessingComplete(invoiceId) {
    const metadata = this.createMetadata({ invoiceId }, 'PROCESSING_COMPLETE');
    this.info('Invoice processing completed successfully', metadata);
  }

  /**
   * Log when an error occurs during invoice processing
   * @param {string} invoiceId - The ID of the invoice
   * @param {Error} error - The error that occurred
   * @param {string} stage - The processing stage when the error occurred
   */
  logError(invoiceId, error, stage) {
    const metadata = this.createMetadata({
      invoiceId,
      error: error?.message || 'Unknown error',
      stack: error?.stack || '',
      stage
    }, 'PROCESSING_ERROR');
    
    this.error('Error during invoice processing', metadata);
  }

  /**
   * Log when invoice validation fails
   * @param {string} invoiceId - The ID of the invoice
   * @param {Error} error - The validation error
   */
  logValidationError(invoiceId, error) {
    const metadata = this.createMetadata({
      invoiceId,
      error: error?.message || 'Unknown error'
    }, 'VALIDATION_ERROR');
    
    this.warn('Invoice validation failed', metadata);
  }

  /**
 * Log when deletion is initiated by a partner
 * @param {string} invoiceId
 * @param {string} partnerId
 */
  logDeletionStart(invoiceId, partnerId) {
    const metadata = this.createMetadata({ invoiceId, partnerId }, 'DELETION_START');
    this.info('Partner initiated invoice deletion', metadata);
  }

  /**
   * Log when invoice file is deleted from S3
   * @param {string} invoiceId
   * @param {string} fileKey
   */
  logS3DeletionSuccess(invoiceId, fileKey) {
    const metadata = this.createMetadata({ invoiceId, fileKey }, 'DELETE_S3_SUCCESS');
    this.info('Invoice file deleted from S3', metadata);
  }

  /**
   * Log when invoice is successfully deleted from the database
   * @param {string} invoiceId
   */
  logDatabaseDeletionSuccess(invoiceId) {
    const metadata = this.createMetadata({ invoiceId }, 'DELETE_DB_SUCCESS');
    this.info('Invoice deleted from database', metadata);
  }

  /**
   * Log when the overall deletion process is complete
   * @param {string} invoiceId
   * @param {string} partnerId
   */
  logDeletionSuccess(invoiceId, partnerId) {
    const metadata = this.createMetadata({ invoiceId, partnerId }, 'DELETE_SUCCESS');
    this.info('Invoice deletion completed successfully', metadata);
  }

  /**
   * Log error during any stage of deletion
   * @param {string} invoiceId
   * @param {Error} error
   * @param {string} stage
   */
  logDeletionError(invoiceId, error, stage) {
    const metadata = this.createMetadata({
      invoiceId,
      error: error?.message || 'Unknown error',
      stack: error?.stack || '',
      stage
    }, 'DELETE_ERROR');
    this.error('Error occurred during invoice deletion', metadata);
  }  

  /**
   * Log when an invoice retrieval is initiated
   * @param {string} invoiceId - The ID of the invoice
   */
  logRetrievalStart(invoiceId) {
    const metadata = this.createMetadata({ invoiceId }, 'GET_INVOICE_START');
    this.info('Invoice retrieval initiated', metadata);
  }

  /**
   * Log when an invoice is successfully retrieved
   * @param {string} invoiceId - The ID of the invoice
   * @param {Object} summary - Summary information about the retrieved data
   */
  logRetrievalSuccess(invoiceId, summary = {}) {
    const metadata = this.createMetadata({ invoiceId, summary }, 'GET_INVOICE_SUCCESS');
    this.info('Invoice retrieved successfully', metadata);
  }

  /**
   * Log when an invoice being retrieved is still processing
   * @param {string} invoiceId - The ID of the invoice
   */
  logRetrievalProcessing(invoiceId) {
    const metadata = this.createMetadata({ invoiceId }, 'GET_INVOICE_PROCESSING');
    this.info('Retrieved invoice still in processing state', metadata);
  }

  /**
   * Log when an invoice being retrieved has failed processing
   * @param {string} invoiceId - The ID of the invoice
   */
  logRetrievalFailed(invoiceId) {
    const metadata = this.createMetadata({ invoiceId }, 'GET_INVOICE_FAILED');
    this.warn('Retrieved invoice has failed processing', metadata);
  }

  /**
   * Log when an error occurs during invoice retrieval
   * @param {string} invoiceId - The ID of the invoice
   * @param {Error} error - The error that occurred
   * @param {string} stage - The retrieval stage where the error occurred
   */
  logRetrievalError(invoiceId, error, stage) {
    const metadata = this.createMetadata({
      invoiceId,
      error: error?.message || 'Unknown error',
      stack: error?.stack || '',
      stage
    }, 'GET_INVOICE_ERROR');
    
    this.error('Error during invoice retrieval', metadata);
  }
}

module.exports = InvoiceLogger;