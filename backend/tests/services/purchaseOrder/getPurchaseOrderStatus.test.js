const purchaseOrderService = require('../../../src/services/purchaseOrder/purchaseOrderService');
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');
const { from } = require('rxjs');

// Mock console.error for error logging tests
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock PurchaseOrderLogger
jest.mock('../../../src/services/purchaseOrder/purchaseOrderLogger', () => ({
  logStatusRequest: jest.fn(),
  logStatusNotFound: jest.fn(),
  logStatusError: jest.fn()
}));
const PurchaseOrderLogger = require('../../../src/services/purchaseOrder/purchaseOrderLogger');

// Mock repositories
jest.mock('../../../src/repositories/purchaseOrderRepository', () => {
  return jest.fn().mockImplementation(() => ({
    findById: jest.fn()
  }));
});

// Mock other dependencies
jest.mock('../../../src/repositories/customerRepository');
jest.mock('../../../src/repositories/vendorRepository');
jest.mock('../../../src/repositories/itemRepository');
jest.mock('../../../src/instrument', () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn()
}));

describe('getPurchaseOrderStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return purchase order status for valid ID', async () => {
    // Setup
    const purchaseOrderId = 'test-po-123';
    const mockPurchaseOrder = { 
      id: purchaseOrderId, 
      status: DocumentStatus.ANALYZED 
    };
    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(mockPurchaseOrder);
    
    // Act
    const result = await purchaseOrderService.getPurchaseOrderStatus(purchaseOrderId);
    
    // Assert
    expect(purchaseOrderService.purchaseOrderRepository.findById).toHaveBeenCalledWith(purchaseOrderId);
    expect(result).toEqual({
      id: purchaseOrderId,
      status: DocumentStatus.ANALYZED
    });
    expect(PurchaseOrderLogger.logStatusRequest).toHaveBeenCalledWith(purchaseOrderId, DocumentStatus.ANALYZED);
  });

  test('should return PROCESSING status when purchase order is still processing', async () => {
    // Arrange
    const purchaseOrderId = 'test-po-123';
    const mockPurchaseOrder = {
      id: purchaseOrderId,
      status: DocumentStatus.PROCESSING,
      partner_id: 'partner-abc'
    };

    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(mockPurchaseOrder);

    // Act
    const result = await purchaseOrderService.getPurchaseOrderStatus(purchaseOrderId);

    // Assert
    expect(result).toEqual({
      id: purchaseOrderId,
      status: DocumentStatus.PROCESSING
    });
  });

  test('should throw error when purchase order not found', async () => {
    // Arrange
    const purchaseOrderId = 'non-existent-po';
    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(purchaseOrderService.getPurchaseOrderStatus(purchaseOrderId))
      .rejects.toThrow('Purchase order not found');
    expect(purchaseOrderService.purchaseOrderRepository.findById).toHaveBeenCalledWith(purchaseOrderId);
  });

  test('should handle synchronous errors in the method', async () => {
    // Arrange
    const purchaseOrderId = 'test-po-123';
    const synchronousError = new Error('Synchronous error in method');
    
    // Make the repository throw a synchronous error instead of mocking from()
    purchaseOrderService.purchaseOrderRepository.findById = jest.fn(() => {
      throw synchronousError;
    });
    
    // Act & Assert
    await expect(purchaseOrderService.getPurchaseOrderStatus(purchaseOrderId))
      .rejects.toThrow('Synchronous error in method');
      
    // Verify proper logging and error tracking
    expect(console.error).toHaveBeenCalledWith(
      `Error in getPurchaseOrderStatus: ${synchronousError.message}`, 
      synchronousError
    );
    expect(PurchaseOrderLogger.logStatusError).toHaveBeenCalledWith(
      purchaseOrderId, 
      synchronousError
    );
    expect(require('../../../src/instrument').captureException).toHaveBeenCalledWith(synchronousError);
  });

  test('should handle errors in the outer try-catch block', async () => {
    // Arrange
    const purchaseOrderId = 'test-po-123';
    
    // Create a simpler approach - make the repository undefined to cause an error
    const originalRepository = purchaseOrderService.purchaseOrderRepository;
    purchaseOrderService.purchaseOrderRepository = undefined;
    
    try {
      // Act & Assert
      await expect(purchaseOrderService.getPurchaseOrderStatus(purchaseOrderId))
        .rejects.toThrow(); // Any error is fine here
      
      // Verify error logging occurred - we don't care about the exact error message
      expect(console.error).toHaveBeenCalled();
      expect(PurchaseOrderLogger.logStatusError).toHaveBeenCalledWith(
        purchaseOrderId, 
        expect.any(Error)
      );
      expect(require('../../../src/instrument').captureException).toHaveBeenCalled();
    } finally {
      // Cleanup - restore the repository
      purchaseOrderService.purchaseOrderRepository = originalRepository;
    }
  });
});