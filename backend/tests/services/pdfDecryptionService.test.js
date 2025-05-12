const PdfDecryptionService = require('../../src/services/pdfDecryptionService');
const PdfDecryptionStrategy = require('../../src/strategies/pdfDecryptionStrategy');

// Mock PDFLogger
jest.mock('../../src/services/pdfLoggerAdapter', () => ({
  logDecryptionStart: jest.fn(),
  logDecryptionSuccess: jest.fn(),
  logDecryptionError: jest.fn()
}));

// Mock Sentry
jest.mock('../../src/instrument', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  configureScope: jest.fn(cb => cb({
    setContext: jest.fn()
  }))
}));

class MockDecryptionStrategy extends PdfDecryptionStrategy {
  decrypt = jest.fn();
  constructor() {
    super();
    this.strategyName = 'MockDecryptionStrategy';
  }
}

describe('PdfDecryptionService', () => {
  let decryptionService;
  let mockStrategy;

  beforeEach(() => {
    mockStrategy = new MockDecryptionStrategy();
    decryptionService = new PdfDecryptionService(mockStrategy);
  });

  test('should properly initialize with strategy', () => {
    expect(decryptionService.decryptionStrategy).toBe(mockStrategy);
  });

  test('should call decrypt method on the strategy', async () => {
    const pdfBuffer = Buffer.from('dummy PDF content');
    const password = 'password123';
    
    mockStrategy.decrypt.mockResolvedValue(Buffer.from('decrypted content'));
    
    const result = await decryptionService.decrypt(pdfBuffer, password);
    
    expect(mockStrategy.decrypt).toHaveBeenCalledWith(pdfBuffer, password);
    expect(result).toEqual(Buffer.from('decrypted content'));
  });

  test('should pass through the exact buffer from the strategy', async () => {
    const pdfBuffer = Buffer.from('encrypted PDF content');
    const password = 'password123';
    const decryptedBuffer = Buffer.from('decrypted content');
    
    mockStrategy.decrypt.mockResolvedValue(decryptedBuffer);
    
    const result = await decryptionService.decrypt(pdfBuffer, password);
    
    // Test for reference equality, not just content equality
    expect(result).toBe(decryptedBuffer);
  });

  test('should throw an error if strategy decrypt method fails', async () => {
    const pdfBuffer = Buffer.from('dummy PDF content');
    const password = 'password123';
    const error = new Error('Decryption failed');
    
    mockStrategy.decrypt.mockRejectedValue(error);
    
    await expect(decryptionService.decrypt(pdfBuffer, password))
      .rejects.toThrow('Decryption failed');
    
    // Verify the exact error is passed through
    await expect(decryptionService.decrypt(pdfBuffer, password))
      .rejects.toBe(error);
  });
});