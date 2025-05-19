const { of, throwError } = require('rxjs');
const purchaseOrderService = require('../../../src/services/purchaseOrder/purchaseOrderService');
const PurchaseOrderLogger = require('../../../src/services/purchaseOrder/purchaseOrderLogger');

// Mock dependencies
jest.mock('../../../src/instrument', () => ({
    captureException: jest.fn(),
    addBreadcrumb: jest.fn()
}));

jest.mock('../../../src/repositories/purchaseOrderRepository', () => {
    return jest.fn().mockImplementation(() => ({
        delete: jest.fn(),
        findById: jest.fn()
    }));
});

jest.mock('../../../src/services/purchaseOrder/purchaseOrderLogger', () => ({
    logDeletionInitiated: jest.fn(),
    logDeletionSuccess: jest.fn(),
    logDeletionError: jest.fn()
}));

jest.mock('rxjs', () => {
    const original = jest.requireActual('rxjs');
    return {
        ...original,
        from: jest.fn()
    };
});

describe('PurchaseOrder Delete Operation with Logging', () => {
    const { from } = require('rxjs');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should log deletion initiated and success when operation succeeds', (done) => {
        // Arrange
        const purchaseOrderId = 'po-12345';
        from.mockImplementation((input) => {
            if (typeof input === 'function' || input instanceof Promise) {
                return of(undefined);
            }
            return of(1); // Successful deletion (1 row affected)
        });

        // Act
        purchaseOrderService.deletePurchaseOrderById(purchaseOrderId).subscribe({
            next: (result) => {
                // Assert
                expect(result).toEqual({ message: 'Purchase order successfully deleted' });
                expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);
                expect(PurchaseOrderLogger.logDeletionSuccess).toHaveBeenCalledWith(purchaseOrderId);
                expect(PurchaseOrderLogger.logDeletionError).not.toHaveBeenCalled();
                
                // Verify repository called
                expect(purchaseOrderService.purchaseOrderRepository.delete).toHaveBeenCalledWith(purchaseOrderId);
                done();
            },
            error: (error) => done(error)
        });
    });

    test('should log deletion initiated and error when no rows deleted', (done) => {
        // Arrange
        const purchaseOrderId = 'non-existent-po';
        from.mockImplementation((input) => {
            if (typeof input === 'function' || input instanceof Promise) {
                return of(undefined);
            }
            return of(0); // Failed deletion (0 rows affected)
        });

        // Act
        purchaseOrderService.deletePurchaseOrderById(purchaseOrderId).subscribe({
            next: () => done(new Error('Should have thrown an error')),
            error: (error) => {
                // Assert
                expect(error.message).toContain(`Failed to delete purchase order with ID: ${purchaseOrderId}`);
                expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);
                expect(PurchaseOrderLogger.logDeletionSuccess).not.toHaveBeenCalled();
                expect(PurchaseOrderLogger.logDeletionError).toHaveBeenCalledWith(
                    purchaseOrderId,
                    expect.objectContaining({
                        message: expect.stringContaining(`Failed to delete purchase order with ID: ${purchaseOrderId}`)
                    })
                );
                done();
            }
        });
    });

    test('should log deletion initiated and error when database error occurs', (done) => {
        // Arrange
        const purchaseOrderId = 'po-12345';
        const mockError = new Error('Database connection error');
        mockError.code = 'DB_ERROR';
        
        from.mockImplementation((input) => {
            if (typeof input === 'function' || input instanceof Promise) {
                return of(undefined);
            }
            return throwError(() => mockError);
        });

        // Act
        purchaseOrderService.deletePurchaseOrderById(purchaseOrderId).subscribe({
            next: () => done(new Error('Should have thrown an error')),
            error: (error) => {
                // Assert
                expect(error).toBe(mockError);
                expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);
                expect(PurchaseOrderLogger.logDeletionSuccess).not.toHaveBeenCalled();
                expect(PurchaseOrderLogger.logDeletionError).toHaveBeenCalledWith(
                    purchaseOrderId,
                    mockError
                );
                done();
            }
        });
    });

    test('should handle and log errors with different types correctly', (done) => {
        // Arrange
        const purchaseOrderId = 'po-12345';
        const mockError = new TypeError('Invalid parameter type');
        mockError.code = 'TYPE_ERROR';
        
        from.mockImplementation((input) => {
            if (typeof input === 'function' || input instanceof Promise) {
                return of(undefined);
            }
            return throwError(() => mockError);
        });

        // Act
        purchaseOrderService.deletePurchaseOrderById(purchaseOrderId).subscribe({
            next: () => done(new Error('Should have thrown an error')),
            error: (error) => {
                // Assert
                expect(error).toBe(mockError);
                expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);
                expect(PurchaseOrderLogger.logDeletionError).toHaveBeenCalledWith(
                    purchaseOrderId,
                    expect.objectContaining({
                        message: 'Invalid parameter type',
                        code: 'TYPE_ERROR',
                        name: 'TypeError'
                    })
                );
                done();
            }
        });
    });
});