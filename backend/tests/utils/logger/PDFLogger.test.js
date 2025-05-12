// filepath: c:\College\6th-Term\PPL\fin-invoice-ocr-team6\backend\tests\utils\logger\PDFLogger.test.js
const PDFLogger = require('../../../src/utils/logger/PDFLogger');

// To properly test PDFLogger methods, we need to mock BaseLogger methods
// while preserving the PDFLogger's own methods
jest.mock('../../../src/utils/logger/BaseLogger', () => {
  return class MockBaseLogger {
    constructor() {
      this.info = jest.fn();
      this.warn = jest.fn();
      this.error = jest.fn();
      this.createMetadata = jest.fn().mockReturnValue({});
    }
  };
});

describe('PDFLogger', () => {
  let logger;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset the singleton instance between tests
    PDFLogger.instance = null;
    logger = PDFLogger.getInstance();
  });

  test('should implement singleton pattern', () => {
    const instance1 = PDFLogger.getInstance();
    const instance2 = PDFLogger.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should log decryption start', () => {
    logger.logDecryptionStart(1024, 'qpdf-decrypt');
    expect(logger.info).toHaveBeenCalled();
  });

  test('should log decryption success', () => {
    logger.logDecryptionSuccess(1024, 150, 'qpdf');
    expect(logger.info).toHaveBeenCalled();
  });

  test('should log decryption error', () => {
    const error = new Error('Test error');
    logger.logDecryptionError(1024, error, 'qpdf');
    expect(logger.error).toHaveBeenCalled();
  });

  test('should log decryption availability when available', () => {
    logger.logDecryptionAvailability('qpdf', true);
    expect(logger.info).toHaveBeenCalled();
  });

  test('should log decryption availability when not available', () => {
    logger.logDecryptionAvailability('qpdf', false);
    expect(logger.warn).toHaveBeenCalled();
  });

  test('should handle null error in logDecryptionError', () => {
    logger.logDecryptionError(1024, null, 'qpdf');
    expect(logger.error).toHaveBeenCalled();
  });
});