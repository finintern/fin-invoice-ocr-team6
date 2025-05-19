const purchaseOrderService = require('../../../src/services/purchaseOrder/purchaseOrderService');
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');

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

// Mock formatter
jest.mock('../../../src/services/purchaseOrder/purchaseOrderResponseFormatter', () => {
  return jest.fn().mockImplementation(() => ({
    formatPurchaseOrderResponse: jest.fn()
  }));
});

// Mock Sentry
jest.mock('../../../src/instrument', () => ({
  init: jest.fn(),
  startSpan: jest.fn((_, callback) => callback({
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn()
  })),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('Purchase Order Service - getPurchaseOrderById', () => {
  // Setup common response format
  const mockFormattedResponse = {
    data: {
      documents: [{
        header: {
          purchase_order_details: {
            purchase_order_id: 'PO-123',
            purchase_order_date: "2025-02-01"
          },
          vendor_details: {
            name: null,
            address: "",
            recipient_name: null,
            tax_id: null
          },
          customer_details: {
            id: null,
            name: null,
            recipient_name: null,
            address: "",
            tax_id: null
          },
          financial_details: {
            currency: { currency_symbol: "$", currency_code: "USD" },
            total_amount: 0,
            subtotal_amount: 0,
            discount_amount: 0,
            total_tax_amount: 0
          }
        },
        items: []
      }]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console to prevent cluttering test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Setup default mock behavior
    purchaseOrderService.responseFormatter.formatPurchaseOrderResponse = jest.fn().mockReturnValue(mockFormattedResponse);
  });

  afterEach(() => {
    console.error.mockRestore();
    jest.restoreAllMocks();
  });

  test('should return formatted purchase order when found', (done) => {
    // Arrange
    const purchaseOrderId = 'test-po-123';
    const mockPurchaseOrder = {
      id: purchaseOrderId,
      status: DocumentStatus.ANALYZED,
      po_number: 'PO-123',
      partner_id: 'partner-abc'
    };

    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(mockPurchaseOrder);
    purchaseOrderService.itemRepository.findItemsByDocumentId = jest.fn().mockResolvedValue([]);
    purchaseOrderService.customerRepository.findById = jest.fn().mockResolvedValue(null);
    purchaseOrderService.vendorRepository.findById = jest.fn().mockResolvedValue(null);

    // Act
    purchaseOrderService.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: (result) => {
        // Assert
        expect(purchaseOrderService.purchaseOrderRepository.findById).toHaveBeenCalledWith(purchaseOrderId);
        expect(purchaseOrderService.responseFormatter.formatPurchaseOrderResponse).toHaveBeenCalledWith(
          mockPurchaseOrder,
          [],
          null,
          null
        );
        expect(result).toEqual(mockFormattedResponse);
        done();
      },
      error: (error) => {
        done.fail(`Test failed with error: ${error}`);
      }
    });
  });

  test('should emit error when purchase order not found', (done) => {
    // Arrange
    const purchaseOrderId = 'non-existent-po';
    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(null);
    
    // Act & Assert
    purchaseOrderService.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: () => {
        done.fail('Expected error but got success response');
      },
      error: (error) => {
        expect(error.message).toBe('Purchase order not found');
        expect(purchaseOrderService.purchaseOrderRepository.findById).toHaveBeenCalledWith(purchaseOrderId);
        expect(purchaseOrderService.responseFormatter.formatPurchaseOrderResponse).not.toHaveBeenCalled();
        done();
      }
    });
  });

  test('should propagate repository errors', (done) => {
    // Arrange
    const purchaseOrderId = 'test-po-123';
    const dbError = new Error('Database connection failed');
    purchaseOrderService.purchaseOrderRepository.findById.mockRejectedValue(dbError);

    // Act & Assert
    purchaseOrderService.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: () => {
        done.fail('Expected error but got success response');
      },
      error: (error) => {
        expect(error.message).toBe('Database connection failed');
        expect(purchaseOrderService.purchaseOrderRepository.findById).toHaveBeenCalledWith(purchaseOrderId);
        expect(console.error).toHaveBeenCalledWith('Error retrieving purchase order:', dbError);
        done();
      }
    });
  });

  test('should return processing message when status is PROCESSING', (done) => {
    // Arrange
    const purchaseOrderId = 'processing-po';
    const mockPurchaseOrder = {
      id: purchaseOrderId,
      status: DocumentStatus.PROCESSING
    };

    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(mockPurchaseOrder);

    // Act
    purchaseOrderService.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: (result) => {
        // Assert
        expect(result).toEqual({
          message: 'Purchase order is still being processed. Please try again later.',
          data: { documents: [] }
        });
        expect(purchaseOrderService.itemRepository.findItemsByDocumentId).not.toHaveBeenCalled();
        expect(purchaseOrderService.responseFormatter.formatPurchaseOrderResponse).not.toHaveBeenCalled();
        done();
      },
      error: (error) => {
        done.fail(`Test failed with error: ${error}`);
      }
    });
  });

  test('should return failed message when status is FAILED', (done) => {
    // Arrange
    const purchaseOrderId = 'failed-po';
    const mockPurchaseOrder = {
      id: purchaseOrderId,
      status: DocumentStatus.FAILED
    };

    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(mockPurchaseOrder);

    // Act
    purchaseOrderService.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: (result) => {
        // Assert
        expect(result).toEqual({
          message: 'Purchase order processing failed. Please re-upload the document.',
          data: { documents: [] }
        });
        expect(purchaseOrderService.itemRepository.findItemsByDocumentId).not.toHaveBeenCalled();
        expect(purchaseOrderService.responseFormatter.formatPurchaseOrderResponse).not.toHaveBeenCalled();
        done();
      },
      error: (error) => {
        done.fail(`Test failed with error: ${error}`);
      }
    });
  });

  test('should include customer and vendor data when they exist', (done) => {
    // Arrange
    const purchaseOrderId = 'complete-po';
    const mockPurchaseOrder = {
      id: purchaseOrderId,
      po_date: '2025-02-01',
      status: DocumentStatus.ANALYZED,
      customer_id: 'customer-123',
      vendor_id: 'vendor-456'
    };

    const mockCustomer = { uuid: 'customer-123', name: 'Test Customer' };
    const mockVendor = { uuid: 'vendor-456', name: 'Test Vendor' };
    const mockItems = [
      { description: 'Item 1', quantity: 2, unit: 'pcs', unit_price: 500, amount: 1000 }
    ];

    purchaseOrderService.purchaseOrderRepository.findById.mockResolvedValue(mockPurchaseOrder);
    purchaseOrderService.customerRepository.findById.mockResolvedValue(mockCustomer);
    purchaseOrderService.vendorRepository.findById.mockResolvedValue(mockVendor);
    purchaseOrderService.itemRepository.findItemsByDocumentId.mockResolvedValue(mockItems);

    // Act
    purchaseOrderService.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: () => {
        // Assert
        expect(purchaseOrderService.customerRepository.findById).toHaveBeenCalledWith('customer-123');
        expect(purchaseOrderService.vendorRepository.findById).toHaveBeenCalledWith('vendor-456');
        expect(purchaseOrderService.responseFormatter.formatPurchaseOrderResponse).toHaveBeenCalledWith(
          mockPurchaseOrder,
          mockItems,
          mockCustomer,
          mockVendor
        );
        done();
      },
      error: (error) => {
        done.fail(`Test failed with error: ${error}`);
      }
    });
  });
});