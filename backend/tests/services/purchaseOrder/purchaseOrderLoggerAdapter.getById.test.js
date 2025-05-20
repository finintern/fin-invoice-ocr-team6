const PurchaseOrderLoggerAdapter = require('../../../src/services/purchaseOrder/purchaseOrderLogger');
const PurchaseOrderLogger = require('../../../src/utils/logger/PurchaseOrderLogger');

// Mock PurchaseOrderLogger
jest.mock('../../../src/utils/logger/PurchaseOrderLogger', () => {
  const mockInstance = {
    logGetByIdRequest: jest.fn(),
    logGetByIdSuccess: jest.fn(),
    logGetByIdNotFound: jest.fn(),
    logGetByIdError: jest.fn(),
  };

  return {
    getInstance: jest.fn(() => mockInstance),
    instance: mockInstance
  };
});

describe('PurchaseOrderLoggerAdapter - Get By ID Operations', () => {
  let loggerInstance;
  const TEST_PURCHASE_ORDER_ID = 'po-123';
  
  beforeEach(() => {
    // Get the mock logger instance
    loggerInstance = PurchaseOrderLogger.getInstance();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Request Adapter', () => {
    it('should delegate get by id request to logger instance', () => {
      PurchaseOrderLoggerAdapter.logGetByIdRequest(TEST_PURCHASE_ORDER_ID);
      
      expect(loggerInstance.logGetByIdRequest).toHaveBeenCalledWith(TEST_PURCHASE_ORDER_ID);
      expect(loggerInstance.logGetByIdRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Success Adapter', () => {
    it('should delegate get by id success to logger instance', () => {
      PurchaseOrderLoggerAdapter.logGetByIdSuccess(TEST_PURCHASE_ORDER_ID);
      
      expect(loggerInstance.logGetByIdSuccess).toHaveBeenCalledWith(TEST_PURCHASE_ORDER_ID);
      expect(loggerInstance.logGetByIdSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Not Found Adapter', () => {
    it('should delegate get by id not found to logger instance', () => {
      PurchaseOrderLoggerAdapter.logGetByIdNotFound(TEST_PURCHASE_ORDER_ID);
      
      expect(loggerInstance.logGetByIdNotFound).toHaveBeenCalledWith(TEST_PURCHASE_ORDER_ID);
      expect(loggerInstance.logGetByIdNotFound).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Adapter', () => {
    it('should delegate get by id error to logger instance', () => {
      const error = new Error('Database error');
      
      PurchaseOrderLoggerAdapter.logGetByIdError(TEST_PURCHASE_ORDER_ID, error);
      
      expect(loggerInstance.logGetByIdError).toHaveBeenCalledWith(TEST_PURCHASE_ORDER_ID, error);
      expect(loggerInstance.logGetByIdError).toHaveBeenCalledTimes(1);
    });
  });
}); 