const PDFLogger = require('../utils/logger/PDFLogger');

/**
 * This is a compatibility adapter for the PDFLogger class
 * It maintains backward compatibility with code that expects static class methods
 * while using the new, more SOLID logger implementation under the hood
 */
class PDFLoggerAdapter {
  static logDecryptionStart(fileSize, operation) {
    return PDFLogger.getInstance().logDecryptionStart(fileSize, operation);
  }

  static logDecryptionSuccess(fileSize, processTime, strategy) {
    return PDFLogger.getInstance().logDecryptionSuccess(fileSize, processTime, strategy);
  }

  static logDecryptionError(fileSize, error, strategy) {
    return PDFLogger.getInstance().logDecryptionError(fileSize, error, strategy);
  }
  
  static logDecryptionAvailability(strategy, available) {
    return PDFLogger.getInstance().logDecryptionAvailability(strategy, available);
  }
}

module.exports = PDFLoggerAdapter;