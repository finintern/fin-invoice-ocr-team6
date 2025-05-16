// filepath: c:\College\6th-Term\PPL\fin-invoice-ocr-team6\backend\tests\services\decryptLoggerAdapter.test.js
const decryptLoggerAdapter = require('../../src/services/decryptLoggerAdapter');

// Mock the DecryptLogger singleton
jest.mock('../../src/utils/logger/DecryptLogger', () => {
  return {
    getInstance: jest.fn().mockReturnValue({
      logDecryptionStart: jest.fn(),
      logDecryptionSuccess: jest.fn(),
      logDecryptionError: jest.fn(),
      logDecryptionAvailability: jest.fn()
    })
  };
});

describe('decryptLoggerAdapter', () => {
  test('should call logDecryptionStart on DecryptLogger instance', () => {
    decryptLoggerAdapter.logDecryptionStart(1024, 'qpdf');
    expect(require('../../src/utils/logger/DecryptLogger').getInstance().logDecryptionStart)
      .toHaveBeenCalledWith(1024, 'qpdf');
  });

  test('should call logDecryptionSuccess on DecryptLogger instance', () => {
    decryptLoggerAdapter.logDecryptionSuccess(1024, 150, 'qpdf');
    expect(require('../../src/utils/logger/DecryptLogger').getInstance().logDecryptionSuccess)
      .toHaveBeenCalledWith(1024, 150, 'qpdf');
  });

  test('should call logDecryptionError on DecryptLogger instance', () => {
    const error = new Error('Test error');
    decryptLoggerAdapter.logDecryptionError(1024, error, 'qpdf');
    expect(require('../../src/utils/logger/DecryptLogger').getInstance().logDecryptionError)
      .toHaveBeenCalledWith(1024, error, 'qpdf');
  });

  test('should call logDecryptionAvailability on DecryptLogger instance', () => {
    decryptLoggerAdapter.logDecryptionAvailability('qpdf', true);
    expect(require('../../src/utils/logger/DecryptLogger').getInstance().logDecryptionAvailability)
      .toHaveBeenCalledWith('qpdf', true);
  });
});