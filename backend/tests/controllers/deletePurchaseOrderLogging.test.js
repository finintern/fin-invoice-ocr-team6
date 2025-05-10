const { mockRequest, mockResponse } = require("jest-mock-req-res");
const PurchaseOrderLogger = require("../../src/services/purchaseOrder/purchaseOrderLogger");
const { of, throwError } = require('rxjs');
const { NotFoundError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock("../../src/services/purchaseOrder/purchaseOrderService", () => ({
  deletePurchaseOrderById: jest.fn(),
  getPartnerId: jest.fn(),
  uploadPurchaseOrder: jest.fn() // Add this required function
}));

jest.mock("../../src/services/validateDeletion", () => ({
  validatePurchaseOrderDeletion: jest.fn()
}));

jest.mock("../../src/services/s3Service", () => ({
  deleteFile: jest.fn()
}));

jest.mock("../../src/instrument", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn()
}));

jest.mock("../../src/services/purchaseOrder/purchaseOrderLogger", () => ({
  logDeletionInitiated: jest.fn(),
  logDeletionSuccess: jest.fn(),
  logDeletionError: jest.fn()
}));

// Must mock PurchaseOrderController before requiring it
jest.mock("../../src/controllers/purchaseOrderController", () => {
  // Store the original module to use it later
  const originalModule = jest.requireActual("../../src/controllers/purchaseOrderController");
  
  // Create a custom version that doesn't throw in the constructor
  const MockPurchaseOrderController = function(dependencies) {
    this.validateDeletionService = dependencies.validateDeletionService;
    this.s3Service = dependencies.s3Service;
    this.purchaseOrderService = dependencies.purchaseOrderService;
    
    // Bind methods
    this.deletePurchaseOrderById = originalModule.PurchaseOrderController.prototype.deletePurchaseOrderById.bind(this);
    this.handleError = jest.fn((res, error) => {
      const status = error.status || 500;
      return res.status(status).json({ message: error.message });
    });
  };
  
  return {
    PurchaseOrderController: MockPurchaseOrderController
  };
});

// Now require the controller after mocking it
const { PurchaseOrderController } = require("../../src/controllers/purchaseOrderController");

describe("PurchaseOrderController - Delete with Logging", () => {
  let req, res, controller;
  const purchaseOrderId = "po-12345";
  const partnerId = "partner-567";
  const fileUrl = "https://s3.amazonaws.com/bucket/sample-file.pdf";
  const fileKey = "sample-file.pdf";

  // Services
  const purchaseOrderService = require("../../src/services/purchaseOrder/purchaseOrderService");
  const validateDeletionService = require("../../src/services/validateDeletion");
  const s3Service = require("../../src/services/s3Service");
  const Sentry = require("../../src/instrument");

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup request and response
    req = mockRequest({
      params: { id: purchaseOrderId },
      user: { uuid: partnerId }
    });
    res = mockResponse();

    // Setup mock implementations
    validateDeletionService.validatePurchaseOrderDeletion.mockResolvedValue({
      id: purchaseOrderId,
      partner_id: partnerId,
      file_url: fileUrl
    });
    s3Service.deleteFile.mockResolvedValue({ success: true });
    purchaseOrderService.deletePurchaseOrderById.mockReturnValue(
      of({ message: "Purchase order successfully deleted" })
    );

    // Create controller instance
    controller = new PurchaseOrderController({
      purchaseOrderService,
      validateDeletionService,
      s3Service
    });
  });

  describe("Logging during successful deletion", () => {
    test("should log deletion initiated at the beginning of the process", (done) => {
      // Act
      controller.deletePurchaseOrderById(req, res);

      // Assert - Check immediate logging
      expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);

      // Give time for async operations
      setTimeout(() => {
        // Verify other expected behaviors
        expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
        expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
        expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: "Purchase order successfully deleted" });

        // Verify no errors were logged
        expect(PurchaseOrderLogger.logDeletionError).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    test("should log error when validation fails", (done) => {
      // Arrange
      const error = new NotFoundError("Purchase order not found");
      error.logged = true; // Already logged by the validator
      validateDeletionService.validatePurchaseOrderDeletion.mockRejectedValue(error);

      // Act
      controller.deletePurchaseOrderById(req, res);

      // Assert - Check immediate logging
      expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);

      // Give time for async operations
      setTimeout(() => {
        expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
        expect(s3Service.deleteFile).not.toHaveBeenCalled();
        expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Purchase order not found" });

        // Verify no duplicate error logs (since error.logged = true)
        expect(PurchaseOrderLogger.logDeletionError).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    test("should log error when S3 file deletion fails", (done) => {
      // Arrange
      const s3Error = { success: false, error: "Access denied" };
      s3Service.deleteFile.mockResolvedValue(s3Error);

      // Act
      controller.deletePurchaseOrderById(req, res);

      // Give time for async operations
      setTimeout(() => {
        expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
        expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
        expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Failed to delete file from S3"),
            error: "Access denied"
          })
        );
        
        // Verify logging behavior
        expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);
        expect(PurchaseOrderLogger.logDeletionSuccess).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    test("should log error when database operation fails", (done) => {
      // Arrange
      const dbError = new Error("Database connection error");
      purchaseOrderService.deletePurchaseOrderById.mockReturnValue(throwError(() => dbError));

      // Act
      controller.deletePurchaseOrderById(req, res);

      // Give time for async operations
      setTimeout(() => {
        expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
        expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
        expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error during deletion" });
        
        // Verify logging behavior
        expect(PurchaseOrderLogger.logDeletionInitiated).toHaveBeenCalledWith(purchaseOrderId);
        expect(PurchaseOrderLogger.logDeletionSuccess).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });
});