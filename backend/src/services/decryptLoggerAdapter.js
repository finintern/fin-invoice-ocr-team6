const DecryptLogger = require('../utils/logger/DecryptLogger');

/**
 * This is a compatibility adapter for the DecryptLogger class
 * It maintains backward compatibility with code that expects static class methods
 * while using the new, more SOLID logger implementation under the hood
 */
class DecryptLoggerAdapter {
  static logDecryptionStart(fileSize, operation) {
    return DecryptLogger.getInstance().logDecryptionStart(fileSize, operation);
  }

  static logDecryptionSuccess(fileSize, processTime, strategy) {
    return DecryptLogger.getInstance().logDecryptionSuccess(fileSize, processTime, strategy);
  }

  static logDecryptionError(fileSize, error, strategy) {
    return DecryptLogger.getInstance().logDecryptionError(fileSize, error, strategy);
  }
  
  static logDecryptionAvailability(strategy, available) {
    return DecryptLogger.getInstance().logDecryptionAvailability(strategy, available);
  }
}

module.exports = DecryptLoggerAdapter;