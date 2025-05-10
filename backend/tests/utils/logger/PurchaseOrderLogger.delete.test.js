const PurchaseOrderLogger = require('../../../src/utils/logger/PurchaseOrderLogger');
const BaseLogger = require('../../../src/utils/logger/BaseLogger');

// Mock the BaseLogger methods
jest.mock('../../../src/utils/logger/BaseLogger', () => {
  return jest.fn().mockImplementation(() => {
    return {
      createMetadata: jest.fn().mockImplementation((data, action) => {
        return { ...data, action };
      }),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  });
});

// Mock singleton instance with required methods
const mockInstance = {
  createMetadata: jest.fn().mockImplementation((data, action) => {
    return { ...data, action };
  }),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logDeletionInitiated: jest.fn().mockImplementation(function(purchaseOrderId) {
    const metadata = this.createMetadata({ purchaseOrderId }, 'DELETION_INITIATED');
    this.info('Purchase order deletion initiated', metadata);
  }),
  logDeletionSuccess: jest.fn().mockImplementation(function(purchaseOrderId) {
    const metadata = this.createMetadata({ purchaseOrderId }, 'DELETION_SUCCESS');
    this.info('Purchase order deleted successfully', metadata);
  }),
  logDeletionError: jest.fn().mockImplementation(function(purchaseOrderId, error) {
    const metadata = this.createMetadata({
      purchaseOrderId,
      error: error?.message || 'Unknown error',
      errorCode: error?.code || '',
      errorName: error?.name || '',
      stack: error?.stack || ''
    }, 'DELETION_ERROR');
    
    this.error('Error deleting purchase order', metadata);
  })
};

// Mock the getInstance method to return our mock instance
jest.spyOn(PurchaseOrderLogger, 'getInstance').mockImplementation(() => mockInstance);

describe('PurchaseOrderLogger - Delete Operations', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = PurchaseOrderLogger.getInstance();
  });
  
  describe('Delete Purchase Order Logging', () => {
    test('logDeletionInitiated should log with correct format and metadata', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      
      // Act
      logger.logDeletionInitiated(purchaseOrderId);
      
      // Assert
      expect(logger.createMetadata).toHaveBeenCalledWith(
        { purchaseOrderId }, 
        'DELETION_INITIATED'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Purchase order deletion initiated',
        expect.objectContaining({ 
          purchaseOrderId,
          action: 'DELETION_INITIATED' 
        })
      );
    });

    test('logDeletionSuccess should log with correct format and metadata', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      
      // Act
      logger.logDeletionSuccess(purchaseOrderId);
      
      // Assert
      expect(logger.createMetadata).toHaveBeenCalledWith(
        { purchaseOrderId }, 
        'DELETION_SUCCESS'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Purchase order deleted successfully',
        expect.objectContaining({ 
          purchaseOrderId,
          action: 'DELETION_SUCCESS' 
        })
      );
    });

    test('logDeletionError should log with correct format and metadata', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      const error = new Error('Failed to delete purchase order');
      error.code = 'DB_ERROR';
      error.name = 'DatabaseError';
      
      // Act
      logger.logDeletionError(purchaseOrderId, error);
      
      // Assert
      expect(logger.createMetadata).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: error.message,
          errorCode: error.code,
          errorName: error.name,
          stack: error.stack
        },
        'DELETION_ERROR'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error deleting purchase order',
        expect.objectContaining({ 
          purchaseOrderId,
          error: error.message,
          errorCode: error.code,
          errorName: error.name,
          action: 'DELETION_ERROR',
          stack: expect.any(String)
        })
      );
    });
    
    test('logDeletionError should handle null error gracefully', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      const error = null;
      
      // Act
      logger.logDeletionError(purchaseOrderId, error);
      
      // Assert
      expect(logger.createMetadata).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'Unknown error',
          errorCode: '',
          errorName: '',
          stack: ''
        },
        'DELETION_ERROR'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error deleting purchase order',
        expect.objectContaining({ 
          purchaseOrderId,
          error: 'Unknown error',
          errorCode: '',
          errorName: '',
          action: 'DELETION_ERROR',
          stack: ''
        })
      );
    });
    
    test('logDeletionError should handle error without additional properties', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      const error = new Error('Simple error message');
      // error has no code or name properties beyond the default
      
      // Act
      logger.logDeletionError(purchaseOrderId, error);
      
      // Assert
      expect(logger.createMetadata).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: error.message,
          errorCode: '',
          errorName: 'Error', // Default error name
          stack: error.stack
        },
        'DELETION_ERROR'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error deleting purchase order',
        expect.objectContaining({ 
          purchaseOrderId,
          error: error.message,
          errorCode: '',
          errorName: 'Error',
          action: 'DELETION_ERROR'
        })
      );
    });
  });
});