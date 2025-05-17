const { describe, it, expect, beforeEach } = require('@jest/globals');
const PurchaseOrderLogger = require('../../../src/utils/logger/PurchaseOrderLogger');

// We'll spy on the actual methods directly instead of using complex mocking
jest.mock('../../../src/utils/logger/BaseLogger', () => {
  return class MockBaseLogger {
    constructor() {
      this.info = jest.fn();
      this.warn = jest.fn();
      this.error = jest.fn();
      this.createMetadata = jest.fn((data, eventType) => ({
        ...data,
        event: eventType
      }));
    }
  };
});

describe('PurchaseOrderLogger - Get By ID Operations', () => {
  let instance;
  const TEST_PURCHASE_ORDER_ID = 'po12345';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset the singleton instance
    delete PurchaseOrderLogger.instance;
    
    // Get a fresh instance for testing
    instance = PurchaseOrderLogger.getInstance();
  });

  describe('Request Logging', () => {
    it('should log when a purchase order retrieval is requested', () => {
      instance.logGetByIdRequest(TEST_PURCHASE_ORDER_ID);
      
      expect(instance.info).toHaveBeenCalledWith(
        'Purchase order retrieval requested',
        expect.objectContaining({
          purchaseOrderId: TEST_PURCHASE_ORDER_ID,
          event: 'GET_BY_ID_REQUEST'
        })
      );
    });
  });

  describe('Success Logging', () => {
    it('should log when a purchase order is successfully retrieved', () => {
      instance.logGetByIdSuccess(TEST_PURCHASE_ORDER_ID);
      
      expect(instance.info).toHaveBeenCalledWith(
        'Purchase order retrieved successfully',
        expect.objectContaining({
          purchaseOrderId: TEST_PURCHASE_ORDER_ID,
          event: 'GET_BY_ID_SUCCESS'
        })
      );
    });
  });

  describe('Not Found Logging', () => {
    it('should log when a purchase order is not found', () => {
      instance.logGetByIdNotFound(TEST_PURCHASE_ORDER_ID);
      
      expect(instance.warn).toHaveBeenCalledWith(
        'Purchase order not found',
        expect.objectContaining({
          purchaseOrderId: TEST_PURCHASE_ORDER_ID,
          event: 'GET_BY_ID_NOT_FOUND'
        })
      );
    });
  });

  describe('Error Logging', () => {
    it('should log when there is an error retrieving a purchase order with complete error details', () => {
      const error = new Error('Database connection failed');
      error.code = 'DB_CONN_ERROR';
      error.name = 'DatabaseError';
      
      instance.logGetByIdError(TEST_PURCHASE_ORDER_ID, error);
      
      expect(instance.error).toHaveBeenCalledWith(
        'Error retrieving purchase order',
        expect.objectContaining({
          purchaseOrderId: TEST_PURCHASE_ORDER_ID,
          error: error.message,
          errorCode: error.code,
          errorName: error.name,
          stack: error.stack,
          event: 'GET_BY_ID_ERROR'
        })
      );
    });

    it('should log when there is an error retrieving a purchase order with null error', () => {
      instance.logGetByIdError(TEST_PURCHASE_ORDER_ID, null);
      
      expect(instance.error).toHaveBeenCalledWith(
        'Error retrieving purchase order',
        expect.objectContaining({
          purchaseOrderId: TEST_PURCHASE_ORDER_ID,
          error: 'Unknown error',
          errorCode: '',
          errorName: '',
          stack: '',
          event: 'GET_BY_ID_ERROR'
        })
      );
    });
  });
}); 