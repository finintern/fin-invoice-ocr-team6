const BaseLogger = require('./BaseLogger');

/**
 * DecryptLogger - Specialized logger for PDF-related operations
 * Implements the Singleton pattern for a consistent logger instance
 * and extends the BaseLogger with PDF-specific logging methods
 */
class DecryptLogger extends BaseLogger {
  /**
   * Create a new DecryptLogger instance
   * @private - Use getInstance() instead
   */
  constructor() {
    super('pdf-service', 'pdf');
  }

  /**
   * Get the singleton instance of DecryptLogger
   * @returns {DecryptLogger} The singleton instance
   */
  static getInstance() {
    if (!DecryptLogger.instance) {
      DecryptLogger.instance = new DecryptLogger();
    }
    return DecryptLogger.instance;
  }

  /**
   * Log when PDF decryption starts
   * @param {number} fileSize - The size of the PDF in bytes
   * @param {string} operation - The decryption operation being performed
   */
  logDecryptionStart(fileSize, operation) {
    const metadata = this.createMetadata({ 
      fileSize,
      operation
    }, 'DECRYPTION_START');
    
    this.info('Starting PDF decryption process', metadata);
  }

  /**
   * Log when PDF decryption is successful
   * @param {number} fileSize - The size of the PDF in bytes
   * @param {number} processTime - The time taken to decrypt in milliseconds
   * @param {string} strategy - The decryption strategy used
   */
  logDecryptionSuccess(fileSize, processTime, strategy) {
    const metadata = this.createMetadata({
      fileSize,
      processTime,
      strategy
    }, 'DECRYPTION_SUCCESS');
    
    this.info('PDF decryption completed successfully', metadata);
  }

  /**
   * Log when PDF decryption fails
   * @param {number} fileSize - The size of the PDF in bytes
   * @param {Error} error - The error that occurred
   * @param {string} strategy - The decryption strategy used
   */
  logDecryptionError(fileSize, error, strategy) {
    const metadata = this.createMetadata({
      fileSize,
      error: error?.message || 'Unknown error',
      stack: error?.stack || '',
      strategy
    }, 'DECRYPTION_ERROR');
    
    this.error('Error during PDF decryption', metadata);
  }

  /**
   * Log information about PDF decryption availability check
   * @param {string} strategy - The decryption strategy being checked
   * @param {boolean} available - Whether the decryption strategy is available
   */
  logDecryptionAvailability(strategy, available) {
    const metadata = this.createMetadata({
      strategy,
      available
    }, 'DECRYPTION_AVAILABILITY');
    
    if (available) {
      this.info(`PDF decryption strategy ${strategy} is available`, metadata);
    } else {
      this.warn(`PDF decryption strategy ${strategy} is not available`, metadata);
    }
  }
}

module.exports = DecryptLogger;