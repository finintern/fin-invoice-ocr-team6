const InvoiceLogger = require('../../utils/logger/InvoiceLogger');

/**
 * This is a compatibility adapter for the InvoiceLogger class
 * It maintains backward compatibility with code that expects the previous static class methods
 * while using the new, more SOLID logger implementation under the hood
 */
class InvoiceLoggerAdapter {
  static logUploadStart(invoiceId, partnerId, filename) {
    return InvoiceLogger.getInstance().logUploadStart(invoiceId, partnerId, filename);
  }

  static logUploadSuccess(invoiceId, s3Url) {
    return InvoiceLogger.getInstance().logUploadSuccess(invoiceId, s3Url);
  }

  static logProcessingStart(invoiceId) {
    return InvoiceLogger.getInstance().logProcessingStart(invoiceId);
  }

  static logAnalysisComplete(invoiceId, jsonUrl) {
    return InvoiceLogger.getInstance().logAnalysisComplete(invoiceId, jsonUrl);
  }

  static logDataMappingComplete(invoiceId, dataSummary) {
    return InvoiceLogger.getInstance().logDataMappingComplete(invoiceId, dataSummary);
  }

  static logProcessingComplete(invoiceId) {
    return InvoiceLogger.getInstance().logProcessingComplete(invoiceId);
  }

  static logError(invoiceId, error, stage) {
    return InvoiceLogger.getInstance().logError(invoiceId, error, stage);
  }

  static logValidationError(invoiceId, error) {
    return InvoiceLogger.getInstance().logValidationError(invoiceId, error);
  }

  static logDeletionStart(invoiceId, partnerId) {
    return InvoiceLogger.getInstance().logDeletionStart(invoiceId, partnerId);
  }
  
  static logS3DeletionSuccess(invoiceId, fileKey) {
    return InvoiceLogger.getInstance().logS3DeletionSuccess(invoiceId, fileKey);
  }
  
  static logDatabaseDeletionSuccess(invoiceId) {
    return InvoiceLogger.getInstance().logDatabaseDeletionSuccess(invoiceId);
  }
  
  static logDeletionSuccess(invoiceId, partnerId) {
    return InvoiceLogger.getInstance().logDeletionSuccess(invoiceId, partnerId);
  }
  
  static logDeletionError(invoiceId, error, stage) {
    return InvoiceLogger.getInstance().logDeletionError(invoiceId, error, stage);
  }
  
}

module.exports = InvoiceLoggerAdapter;