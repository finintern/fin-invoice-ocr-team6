// filepath: c:\College\6th-Term\PPL\fin-invoice-ocr-team6\backend\tests\utils\logger\DecryptLogger.test.js
const DecryptLogger = require('../../../src/utils/logger/DecryptLogger');

// To properly test DecryptLogger methods, we need to mock BaseLogger methods
// while preserving the DecryptLogger's own methods
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

describe('DecryptLogger', () => {
  let logger;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Reset the singleton instance between tests
    DecryptLogger.instance = null;
    logger = DecryptLogger.getInstance();
  });

  test('should implement singleton pattern', () => {
    const instance1 = DecryptLogger.getInstance();
    const instance2 = DecryptLogger.getInstance();
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