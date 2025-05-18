const PurchaseOrderLogger = require('../../../src/utils/logger/PurchaseOrderLogger');

describe('PurchaseOrderLogger Coverage Tests', () => {
  // Store original instance
  let originalInstance;
  
  // Create spies for the instance methods
  let errorSpy;
  let createMetadataSpy;
  
  beforeAll(() => {
    // Save the original instance for restoration
    originalInstance = PurchaseOrderLogger.instance;
    
    // Clear singleton instance to get a fresh instance
    PurchaseOrderLogger.instance = null;
    
    // Get new instance and create spies
    const instance = PurchaseOrderLogger.getInstance();
    errorSpy = jest.spyOn(instance, 'error');
    createMetadataSpy = jest.spyOn(instance, 'createMetadata');
  });
  
  afterAll(() => {
    // Restore original instance
    PurchaseOrderLogger.instance = originalInstance;
    
    // Restore all spies
    jest.restoreAllMocks();
  });
  
  beforeEach(() => {
    // Clear all spy calls before each test
    jest.clearAllMocks();
  });

  describe('logDeletionError edge cases', () => {
    test('should handle custom error with code and name properties', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      
      // Creating a custom error with code property
      const customError = new Error('Database connection failed');
      customError.code = 'DB_CONNECTION_ERROR';
      customError.name = 'DatabaseError';
      
      // Act - Call the method we want to cover
      PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, customError);
      
      // Assert - Verify method calls and parameters
      expect(createMetadataSpy).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'Database connection failed',
          errorCode: 'DB_CONNECTION_ERROR',
          errorName: 'DatabaseError',
          stack: expect.any(String)
        }, 
        'DELETION_ERROR'
      );
      
      expect(errorSpy).toHaveBeenCalledWith(
        'Error deleting purchase order',
        expect.objectContaining({
          purchaseOrderId,
          error: 'Database connection failed',
          errorCode: 'DB_CONNECTION_ERROR',
          errorName: 'DatabaseError'
        })
      );
    });
    
    test('should handle custom error with empty code but custom name', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      const customError = new Error('Validation failed');
      // Only set name but not code
      customError.name = 'ValidationError';
      
      // Act
      PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, customError);
      
      // Assert
      expect(createMetadataSpy).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'Validation failed',
          errorCode: '', // This tests line 167
          errorName: 'ValidationError',
          stack: expect.any(String)
        }, 
        'DELETION_ERROR'
      );
    });
    
    test('should handle custom error with code but default name', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      const customError = new Error('API limit exceeded');
      // Only set code but keep default name
      customError.code = 'RATE_LIMIT_EXCEEDED';
      
      // Act
      PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, customError);
      
      // Assert
      expect(createMetadataSpy).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'API limit exceeded',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          errorName: 'Error', // Default error name
          stack: expect.any(String)
        }, 
        'DELETION_ERROR'
      );
    });
    
    test('should handle non-Error objects as errors', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      // Use a plain object instead of an Error instance
      const nonErrorObject = {
        message: 'Something went wrong',
        code: 'CUSTOM_CODE',
        name: 'CustomError',
        stack: 'mock stack trace'
      };
      
      // Act
      PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, nonErrorObject);
      
      // Assert
      expect(createMetadataSpy).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'Something went wrong',
          errorCode: 'CUSTOM_CODE',
          errorName: 'CustomError',
          stack: 'mock stack trace'
        }, 
        'DELETION_ERROR'
      );
    });
    
    test('should handle error with neither code nor name properties', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      // Create an object without code or name properties
      // This will specifically test lines 167 and 169-170
      const errorWithoutProps = {
        message: 'Generic error message',
        stack: 'mock stack trace'
      };
      
      // Act
      PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, errorWithoutProps);
      
      // Assert
      expect(createMetadataSpy).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'Generic error message',
          errorCode: '', // Tests line 167
          errorName: '', // Tests line 169
          stack: 'mock stack trace'
        }, 
        'DELETION_ERROR'
      );
      
      expect(errorSpy).toHaveBeenCalledWith(
        'Error deleting purchase order',
        expect.objectContaining({
          purchaseOrderId,
          error: 'Generic error message',
          errorCode: '', // Tests line 167
          errorName: '' // Tests line 169
        })
      );
    });
    
    test('should handle error with unexpected properties structure', () => {
      // Arrange
      const purchaseOrderId = 'po-12345';
      // Create an object with nested properties that would typically be accessed directly
      const unusualErrorStructure = {
        details: {
          message: 'Deeply nested error message',
          code: 'NESTED_CODE',
          name: 'NestedError'
        },
        // No direct message, code, or name properties
      };
      
      // Act
      PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, unusualErrorStructure);
      
      // Assert
      expect(createMetadataSpy).toHaveBeenCalledWith(
        {
          purchaseOrderId,
          error: 'Unknown error', // Default when message is undefined
          errorCode: '', // Tests line 167
          errorName: '', // Tests line 169
          stack: '' // Default when stack is undefined
        }, 
        'DELETION_ERROR'
      );
    });
    
    test('should handle primitive values as errors', () => {
      // Testing with various primitive types to ensure robustness
      const purchaseOrderId = 'po-12345';
      
      // All primitive values should result in 'Unknown error' since they don't have a message property
      const testCases = [
        { value: 'string error', expectedMsg: 'Unknown error' },
        { value: 123, expectedMsg: 'Unknown error' },
        { value: true, expectedMsg: 'Unknown error' },
        { value: undefined, expectedMsg: 'Unknown error' }
      ];
      
      testCases.forEach(testCase => {
        // Clear mocks for each test case
        jest.clearAllMocks();
        
        // Act
        PurchaseOrderLogger.getInstance().logDeletionError(purchaseOrderId, testCase.value);
        
        // Assert
        expect(createMetadataSpy).toHaveBeenCalledWith(
          {
            purchaseOrderId,
            error: testCase.expectedMsg,
            errorCode: '', // Tests line 167
            errorName: '', // Tests line 169
            stack: ''
          }, 
          'DELETION_ERROR'
        );
      });
    });
  });
});