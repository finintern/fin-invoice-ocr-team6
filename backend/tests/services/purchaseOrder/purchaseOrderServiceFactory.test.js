const { createPurchaseOrderService } = require('../../../src/services/purchaseOrder/purchaseOrderService');
const { OcrAnalyzerFactory } = require('../../../src/services/analysis');
const { PurchaseOrderService } = require('../../../src/services/purchaseOrder/purchaseOrderService');


// Mock dependencies
jest.mock('../../../src/services/analysis', () => ({
  OcrAnalyzerFactory: {
    createAnalyzer: jest.fn().mockReturnValue({ 
      analyzeDocument: jest.fn(),
      getType: jest.fn().mockReturnValue('azure')
    })
  }
}));

// Mock repositories
jest.mock('../../../src/repositories/purchaseOrderRepository');
jest.mock('../../../src/repositories/customerRepository');
jest.mock('../../../src/repositories/vendorRepository');
jest.mock('../../../src/repositories/itemRepository');

// Mock other services
jest.mock('../../../src/services/purchaseOrder/purchaseOrderValidator', () => 
  jest.fn().mockImplementation(() => ({
    validateFileData: jest.fn()
  }))
);

jest.mock('../../../src/services/purchaseOrder/purchaseOrderResponseFormatter', () => 
  jest.fn().mockImplementation(() => ({
    formatPurchaseOrderResponse: jest.fn()
  }))
);

// Fix the AzurePurchaseOrderMapper mock to make it a proper constructor
jest.mock('../../../src/services/purchaseOrderMapperService/purchaseOrderMapperService', () => ({
  AzurePurchaseOrderMapper: jest.fn().mockImplementation(() => ({
    mapToPurchaseOrderModel: jest.fn()
  }))
}));

jest.mock('../../../src/services/s3Service', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn()
}));

jest.mock('../../../src/services/purchaseOrder/purchaseOrderLogger', () => ({
  logUploadStart: jest.fn(),
  logUploadSuccess: jest.fn(),
  logError: jest.fn()
}));

describe('createPurchaseOrderService Factory Function', () => {
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
    const service = createPurchaseOrderService();
    
    // Verify type is azure
    expect(service.ocrType).toBe('azure');
    
    // Verify OcrAnalyzerFactory was called with correct type
    expect(OcrAnalyzerFactory.createAnalyzer).toHaveBeenCalledWith('azure', expect.any(Object));
  });
  
  test('should use OCR_ANALYZER_TYPE environment variable when available', () => {
    // Set environment variable
    process.env.OCR_ANALYZER_TYPE = 'dummy';
    
    // Create service using factory function
    const service = createPurchaseOrderService();
    
    // Verify type from environment is used
    expect(service.ocrType).toBe('dummy');
    
    // Verify OcrAnalyzerFactory was called with environment variable value
    expect(OcrAnalyzerFactory.createAnalyzer).toHaveBeenCalledWith('dummy', expect.any(Object));
  });
  
  test('should prioritize custom dependencies over environment variables', () => {
    // Set environment variable
    process.env.OCR_ANALYZER_TYPE = 'dummy';
    
        // Create service with custom ocrType
    const service = createPurchaseOrderService({
      ocrType: 'mock'
    });
    
    // Verify custom type is used
    expect(service.ocrType).toBe('mock');
  });

  test('should default to "azure" ocrType when no OCR type is provided', () => {
    // Ensure OCR_ANALYZER_TYPE is deleted from env
    delete process.env.OCR_ANALYZER_TYPE;
    
    // Create service with no ocrType specified
    const service = new PurchaseOrderService({});
    
    // Verify ocrType defaults to 'azure'
    expect(service.ocrType).toBe('azure');
    
    // Verify the OcrAnalyzerFactory was called with 'azure'
    expect(OcrAnalyzerFactory.createAnalyzer).toHaveBeenCalledWith('azure', expect.any(Object));
}); 
});