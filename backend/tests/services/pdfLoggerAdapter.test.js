// filepath: c:\College\6th-Term\PPL\fin-invoice-ocr-team6\backend\tests\services\pdfLoggerAdapter.test.js
const PDFLoggerAdapter = require('../../src/services/pdfLoggerAdapter');

// Mock the PDFLogger singleton
jest.mock('../../src/utils/logger/PDFLogger', () => {
  return {
    getInstance: jest.fn().mockReturnValue({
      logDecryptionStart: jest.fn(),
      logDecryptionSuccess: jest.fn(),
      logDecryptionError: jest.fn(),
      logDecryptionAvailability: jest.fn()
    })
  };
});

describe('PDFLoggerAdapter', () => {
  test('should call logDecryptionStart on PDFLogger instance', () => {
    PDFLoggerAdapter.logDecryptionStart(1024, 'qpdf');
    expect(require('../../src/utils/logger/PDFLogger').getInstance().logDecryptionStart)
      .toHaveBeenCalledWith(1024, 'qpdf');
  });

  test('should call logDecryptionSuccess on PDFLogger instance', () => {
    PDFLoggerAdapter.logDecryptionSuccess(1024, 150, 'qpdf');
    expect(require('../../src/utils/logger/PDFLogger').getInstance().logDecryptionSuccess)
      .toHaveBeenCalledWith(1024, 150, 'qpdf');
  });

  test('should call logDecryptionError on PDFLogger instance', () => {
    const error = new Error('Test error');
    PDFLoggerAdapter.logDecryptionError(1024, error, 'qpdf');
    expect(require('../../src/utils/logger/PDFLogger').getInstance().logDecryptionError)
      .toHaveBeenCalledWith(1024, error, 'qpdf');
  });

  test('should call logDecryptionAvailability on PDFLogger instance', () => {
    PDFLoggerAdapter.logDecryptionAvailability('qpdf', true);
    expect(require('../../src/utils/logger/PDFLogger').getInstance().logDecryptionAvailability)
      .toHaveBeenCalledWith('qpdf', true);
  });
});