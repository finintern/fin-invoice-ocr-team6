const { createInvoiceService } = require('../../../src/services/invoice/invoiceService');
const { OcrAnalyzerFactory } = require('../../../src/services/analysis');

// Mock dependencies
jest.mock('../../../src/services/analysis', () => ({
  OcrAnalyzerFactory: {
    createAnalyzer: jest.fn().mockReturnValue({ analyzeDocument: jest.fn() })
  }
}));

jest.mock('../../../src/repositories/invoiceRepository.js');
jest.mock('../../../src/repositories/customerRepository.js');
jest.mock('../../../src/repositories/vendorRepository.js');
jest.mock('../../../src/repositories/itemRepository.js');
jest.mock('../../../src/services/invoice/invoiceValidator');
jest.mock('../../../src/services/invoice/invoiceResponseFormatter');
jest.mock('../../../src/services/invoiceMapperService/invoiceMapperService', () => ({
  AzureInvoiceMapper: jest.fn().mockImplementation(() => ({
    mapToInvoiceModel: jest.fn()
  }))
}));
jest.mock('../../../src/services/s3Service');

describe('createInvoiceService Factory Function', () => {
  // Save original environment
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.env to clean state for each test
    process.env = { ...originalEnv };
    delete process.env.OCR_ANALYZER_TYPE;
  });
  
  afterAll(() => {
    process.env = originalEnv;
  });

  test('should default to "azure" when OCR_ANALYZER_TYPE environment variable is not set', () => {
    // Ensure environment variable is not set
    delete process.env.OCR_ANALYZER_TYPE;
    
    // Create service using factory function
    const service = createInvoiceService();
    
    // Verify type is azure
    expect(service.ocrType).toBe('azure');
    
    // Verify OcrAnalyzerFactory was called with correct type
    expect(OcrAnalyzerFactory.createAnalyzer).toHaveBeenCalledWith('azure', expect.any(Object));
  });
  
  test('should use OCR_ANALYZER_TYPE environment variable when available', () => {
    // Set environment variable
    process.env.OCR_ANALYZER_TYPE = 'dummy';
    
    // Create service using factory function
    const service = createInvoiceService();
    
    // Verify type from environment is used
    expect(service.ocrType).toBe('dummy');
    
    // Verify OcrAnalyzerFactory was called with environment variable value
    expect(OcrAnalyzerFactory.createAnalyzer).toHaveBeenCalledWith('dummy', expect.any(Object));
  });
  
  test('should prioritize custom dependencies over environment variables', () => {
    // Set environment variable
    process.env.OCR_ANALYZER_TYPE = 'dummy';
    
    // Create service with custom ocrType
    const service = createInvoiceService({
      ocrType: 'mock'
    });
    
    // Verify custom type is used
    expect(service.ocrType).toBe('mock');
  });
});