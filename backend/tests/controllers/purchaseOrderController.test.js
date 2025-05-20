const { mockRequest, mockResponse } = require("jest-mock-req-res");
const { PurchaseOrderController } = require("../../src/controllers/purchaseOrderController");
const purchaseOrderService = require("../../src/services/purchaseOrder/purchaseOrderService");
const pdfValidationService = require("../../src/services/pdfValidationService");
const validateDeletionService = require('../../src/services/validateDeletion');
const s3Service = require('../../src/services/s3Service');
const { PayloadTooLargeError, UnsupportedMediaTypeError, NotFoundError, ForbiddenError, ValidationError } = require("../../src/utils/errors");
const { of, throwError, from } = require('rxjs');

const Sentry = require("@sentry/node");

jest.mock("../../src/services/purchaseOrder/purchaseOrderService");
jest.mock("../../src/services/pdfValidationService");
jest.mock("../../src/services/validateDeletion");
jest.mock("../../src/services/s3Service");
jest.mock("@sentry/node");

jest.mock("../../src/services/purchaseOrder/purchaseOrderService");
jest.mock("../../src/services/pdfValidationService");
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  of: jest.fn().mockImplementation(val => jest.requireActual('rxjs').of(val)),
  throwError: jest.fn().mockImplementation(val => jest.requireActual('rxjs').throwError(val)),
  from: jest.fn().mockImplementation(val => jest.requireActual('rxjs').from(val))
}));


describe("PurchaseOrderController constructor", () => {
  test("should throw error when invalid service is provided", () => {
    expect(() => {
      new PurchaseOrderController();
    }).toThrow('Invalid purchase order service provided');

    const invalidService = {};
    expect(() => {
      new PurchaseOrderController(invalidService);
    }).toThrow('Invalid purchase order service provided');
    
    const invalidService2 = { uploadPurchaseOrder: 'not a function' };
    expect(() => {
      new PurchaseOrderController(invalidService2);
    }).toThrow('Invalid purchase order service provided');
  });

  test("should not throw error when valid dependencies are provided", () => {
    const validService = { uploadPurchaseOrder: jest.fn() };
    const validDeps = {
      purchaseOrderService: validService,
      validateDeletionService: {},
      s3Service: {}
    };
    expect(() => {
      new PurchaseOrderController(validDeps);
    }).not.toThrow();
  });
});

describe("Purchase Order Controller", () => {
  let req, res, controller;
  let consoleErrorSpy;

  const setupTestData = (overrides = {}) => {  
    return {  
      user: { uuid: "test-uuid" },  
      file: {  
        buffer: Buffer.from("test"),  
        originalname: "test.pdf",  
        mimetype: "application/pdf"  
      },
      params: { id: "1" },  
      ...overrides  
    };  
  };

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    pdfValidationService.allValidations.mockResolvedValue(true);    

    purchaseOrderService.uploadPurchaseOrder = jest.fn().mockResolvedValue({
      message: "Purchase order uploaded successfully",
      id: "123"
    });
    purchaseOrderService.getPartnerId = jest.fn();
    purchaseOrderService.getPurchaseOrderById = jest.fn();
    purchaseOrderService.getPurchaseOrderStatus = jest.fn();
    purchaseOrderService.deletePurchaseOrderById = jest.fn().mockReturnValue(of({ message: "Purchase order successfully deleted" }));

    validateDeletionService.validatePurchaseOrderDeletion = jest.fn();

    s3Service.deleteFile = jest.fn().mockResolvedValue({ success: true });

    controller = new PurchaseOrderController({
      purchaseOrderService: purchaseOrderService,
      validateDeletionService: validateDeletionService,
      s3Service: s3Service
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("uploadPurchaseOrder", () => {
    test("should successfully upload when all validations pass", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);

      await controller.uploadPurchaseOrder(req, res);

      expect(purchaseOrderService.uploadPurchaseOrder).toHaveBeenCalledWith({
        buffer: expect.any(Buffer),
        originalname: "test.pdf",
        mimetype: "application/pdf",
        partnerId: "test-uuid"
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: {
          message: "Purchase order uploaded successfully",
          id: "123"
        }
      });
    });

    test("should return 401 when user is not authenticated", async () => {
      const testData = setupTestData({ user: undefined });
      Object.assign(req, testData);

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized"
      });
      expect(purchaseOrderService.uploadPurchaseOrder).not.toHaveBeenCalled();
    });

    test("should return 400 when no file uploaded", async () => {
      const testData = setupTestData({ file: undefined });
      Object.assign(req, testData);

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No file uploaded"
      });
    });

    test("should return 400 when PDF validation fails", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);

      pdfValidationService.allValidations.mockRejectedValue(new Error("Invalid PDF"));

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid PDF"
      });
    });

    test("should handle timeout and return 504", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.uploadPurchaseOrder.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 4000))
      );

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server timeout - upload processing timed out"
      });
    });

    test("should return 500 for unexpected internal server errors", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.uploadPurchaseOrder.mockRejectedValue(new Error("Internal server error"));

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error"
      }); 
    });

    test("should return 413 when file is too large", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);

      pdfValidationService.allValidations.mockRejectedValue(
        new PayloadTooLargeError("File size exceeds 20MB limit")
      );

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        message: "File size exceeds 20MB limit"
      });
    });

    test("should return 415 when file is not PDF", async () => {
      const testData = setupTestData({
        file: {
          buffer: Buffer.from("test"),
          originalname: "test.jpg",
          mimetype: "image/jpeg"
        }
      });
      Object.assign(req, testData);

      pdfValidationService.allValidations.mockRejectedValue(
        new UnsupportedMediaTypeError("Only PDF files are allowed")
      );

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(415);
      expect(res.json).toHaveBeenCalledWith({
        message: "Only PDF files are allowed"
      });
    });
  });

  describe("getPurchaseOrderById", () => {
    beforeEach(() => {
      purchaseOrderService.getPurchaseOrderById = jest.fn();
      purchaseOrderService.getPartnerId = jest.fn();
      jest.clearAllMocks();
    });
    
    test("should return purchase order when authorized", (done) => {
      const mockPurchaseOrder = {
        id: "po-123",
        data: {
          documents: [{
            header: {
              purchase_order_details: {
                purchase_order_id: "PO-2024-001"
              }
            }
          }]
        }
      };
      const testData = setupTestData();
      Object.assign(req, testData);

      // Setup the mocks to work with observable pattern
      purchaseOrderService.getPartnerId.mockResolvedValue("test-uuid");
      purchaseOrderService.getPurchaseOrderById.mockResolvedValue(mockPurchaseOrder);
      
      // Call the method
      controller.getPurchaseOrderById(req, res);
      
      // Use setTimeout to allow observable to complete
      setTimeout(() => {
        expect(purchaseOrderService.getPartnerId).toHaveBeenCalledWith("1");
        expect(purchaseOrderService.getPurchaseOrderById).toHaveBeenCalledWith("1");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockPurchaseOrder);
        done();
      }, 50);
    });

    test("should return 401 when user is not authenticated", (done) => {
      const testData = setupTestData({ user: undefined });
      Object.assign(req, testData);

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          message: "Unauthorized"
        });
        expect(purchaseOrderService.getPurchaseOrderById).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    test("should return 400 when purchase order ID is null", (done) => {
      const testData = setupTestData({ params: { id: null } });
      Object.assign(req, testData);

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          message: "Purchase order ID is required"
        });
        expect(purchaseOrderService.getPurchaseOrderById).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    test("should return 403 when accessing another user's purchase order", (done) => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.getPartnerId.mockResolvedValue("other-uuid");

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          message: "Forbidden: You do not have access to this purchase order"
        });
        expect(purchaseOrderService.getPurchaseOrderById).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    test("should return 404 when purchase order not found", (done) => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.getPartnerId.mockResolvedValue("test-uuid");
      purchaseOrderService.getPurchaseOrderById.mockResolvedValue(null);

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: "Purchase order not found"
        });
        done();
      }, 50);
    });

    test("should return 500 when an unexpected error occurs", (done) => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.getPartnerId.mockRejectedValue(new Error("Database error"));

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Internal server error"
        });
        done();
      }, 50);
    });

    test("should return 500 when purchase order service throws an error", (done) => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.getPartnerId.mockResolvedValue("test-uuid");
      purchaseOrderService.getPurchaseOrderById.mockRejectedValue(new Error("Service error"));

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Internal server error"
        });
        done();
      }, 50);
    });

    test("should handle the case when getPurchaseOrderById returns undefined", (done) => {
      const testData = setupTestData();
      Object.assign(req, testData);

      purchaseOrderService.getPartnerId.mockResolvedValue("test-uuid");
      purchaseOrderService.getPurchaseOrderById.mockResolvedValue(undefined);

      controller.getPurchaseOrderById(req, res);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          message: "Purchase order not found"
        });
        done();
      }, 50);
    });
  });

  describe("deletePurchaseOrderById", () => {
    const partnerId = "test-uuid";
    const purchaseOrderId = "po-123";
    const fileUrl = "https://s3.amazonaws.com/bucket/some-file-key.pdf";
    const fileKey = "some-file-key.pdf";

    beforeEach(() => {
      validateDeletionService.validatePurchaseOrderDeletion.mockClear();
      s3Service.deleteFile.mockClear();
      purchaseOrderService.deletePurchaseOrderById.mockClear();
      validateDeletionService.validatePurchaseOrderDeletion.mockResolvedValue({
        id: purchaseOrderId,
        partner_id: partnerId,
        file_url: fileUrl
      });
      s3Service.deleteFile.mockResolvedValue({ success: true });
      purchaseOrderService.deletePurchaseOrderById.mockReturnValue(of({ message: "Purchase order successfully deleted" }));
      Sentry.captureException.mockClear();
    });

    describe("Positive Cases", () => {
      test("should successfully delete purchase order with S3 file", (done) => {
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({ message: "Purchase order successfully deleted" });
          done();
        }, 50);
      });

      test("should successfully delete purchase order without S3 file", (done) => {
        validateDeletionService.validatePurchaseOrderDeletion.mockResolvedValue({
          id: purchaseOrderId,
          partner_id: partnerId,
          file_url: null
        });
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).not.toHaveBeenCalled();
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({ message: "Purchase order successfully deleted" });
          done();
        }, 50);
      });

      test("should successfully delete purchase order with empty file_url string", (done) => {
        validateDeletionService.validatePurchaseOrderDeletion.mockResolvedValue({
          id: purchaseOrderId,
          partner_id: partnerId,
          file_url: ""
        });
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).not.toHaveBeenCalled();
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({ message: "Purchase order successfully deleted" });
          done();
        }, 50);
      });
    });

    describe("Negative Cases", () => {
      test("should return 401 if user is not authenticated", () => {
        const testData = setupTestData({ user: undefined, params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        expect(validateDeletionService.validatePurchaseOrderDeletion).not.toHaveBeenCalled();
        expect(s3Service.deleteFile).not.toHaveBeenCalled();
        expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      });
      
      test("should return 400 if purchase order ID is missing", () => {
        const testData = setupTestData({ params: {} });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        expect(validateDeletionService.validatePurchaseOrderDeletion).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Purchase order ID is required" });
      });
      
      test("should return 400 if purchase order ID is null", () => {
        const testData = setupTestData({ params: { id: null } }); 
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        expect(validateDeletionService.validatePurchaseOrderDeletion).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Purchase order ID is required" });
      });

      test("should return 404 if validation fails (Not Found)", (done) => {
        const error = new NotFoundError("Purchase order not found");
        validateDeletionService.validatePurchaseOrderDeletion.mockRejectedValue(error);
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).not.toHaveBeenCalled();
          expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.json).toHaveBeenCalledWith({ message: "Purchase order not found" });
          done();
        }, 50);
      });

      test("should return 403 if validation fails (Forbidden)", (done) => {
        const error = new ForbiddenError("Forbidden: You do not own this purchase order");
        validateDeletionService.validatePurchaseOrderDeletion.mockRejectedValue(error);
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).not.toHaveBeenCalled();
          expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: You do not own this purchase order" });
          done();
        }, 50);
      });

      test("should return 409 if validation fails (Conflict - e.g., wrong status)", (done) => {
        const error = new Error("Purchase order cannot be deleted unless it is Analyzed");
        validateDeletionService.validatePurchaseOrderDeletion.mockRejectedValue(error);
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).not.toHaveBeenCalled();
          expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(409);
          expect(res.json).toHaveBeenCalledWith({ message: "Purchase order cannot be deleted unless it is Analyzed" });
          done();
        }, 50);
      });

      test("should return 500 if S3 deletion fails", (done) => {
        s3Service.deleteFile.mockResolvedValue({ success: false, error: "S3 Access Denied" });
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          try {
            expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
            expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
            expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            
            // Use toEqual instead of toHaveBeenCalledWith to be more flexible with object matching
            const expectedResponse = { 
              message: expect.stringContaining("Failed to delete file from S3"),
              error: "S3 Access Denied"
            };
            
            expect(res.json.mock.calls[0][0]).toEqual(expectedResponse);
            done();
          } catch (error) {
            done(error);
          }
        }, 100); // Increased timeout for reliability
      });

      test("should return 500 if service deletion fails (DB Error)", (done) => {
        const dbError = new Error("Database connection error");
        purchaseOrderService.deletePurchaseOrderById.mockReturnValue(throwError(() => dbError));
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: "Internal server error during deletion" }); 
          done();
        }, 50);
      });
       
      test("should return 404 if service deletion indicates PO not found (0 rows affected)", (done) => {
        const serviceError = new Error(`Failed to delete purchase order with ID: ${purchaseOrderId}`);
        purchaseOrderService.deletePurchaseOrderById.mockReturnValue(throwError(() => serviceError));
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(404); 
          expect(res.json).toHaveBeenCalledWith({ message: `Failed to delete purchase order with ID: ${purchaseOrderId}` });
          done();
        }, 50);
      });

      test("should return 500 for other service deletion errors", (done) => {
        const genericServiceError = new Error("Failed to delete purchase order due to constraint violation");
        purchaseOrderService.deletePurchaseOrderById.mockReturnValue(throwError(() => genericServiceError));
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(500); 
          expect(res.json).toHaveBeenCalledWith({ message: "Failed to delete purchase order due to constraint violation" }); 
          done();
        }, 50);
      });

      test("should return 500 if validation throws an unexpected error", (done) => {
        // Create a generic error (not one of the specific error types)
        const unexpectedError = new Error("Unexpected system error during validation");
        validateDeletionService.validatePurchaseOrderDeletion.mockRejectedValue(unexpectedError);
        
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).not.toHaveBeenCalled();
          expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: "Internal server error during deletion" });
          expect(Sentry.captureException).toHaveBeenCalledWith(
            unexpectedError, 
            { extra: { purchaseOrderId: purchaseOrderId, partnerId } }
          );
          done();
        }, 50);
      });
    });

    describe("Corner Cases", () => {
      test("should default to status 500 if S3 deletion error has no status field", (done) => {
        const s3Error = new Error("Failed to delete file from S3 for PO unknown reason");
        
        validateDeletionService.validatePurchaseOrderDeletion.mockResolvedValue({
          file_url: `https://s3.amazonaws.com/bucket/${fileKey}`
        });
        
        s3Service.deleteFile.mockRejectedValue(s3Error);
        
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);
      
        controller.deletePurchaseOrderById(req, res);
      
        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
          expect(purchaseOrderService.deletePurchaseOrderById).not.toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: s3Error.message });
          done();
        }, 50);
      });

      test("should handle unhandled errors in subscription with 500 status", (done) => {
        const subscriptionError = new Error("Subscription processing error");
        const mockObservable = {
          pipe: jest.fn().mockReturnThis(),
          subscribe: jest.fn(callbacks => {
            setTimeout(() => callbacks.error(subscriptionError), 10);
            return { unsubscribe: jest.fn() };
          })
        };
      
        from.mockImplementationOnce(() => mockObservable);
        
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);
      
        controller.deletePurchaseOrderById(req, res);
      
        setTimeout(() => {
          expect(console.error).toHaveBeenCalledWith(
            "Unhandled error in deletePurchaseOrderById subscription:", 
            subscriptionError
          );
          expect(Sentry.captureException).toHaveBeenCalledWith(
            subscriptionError, 
            { 
              extra: { 
                purchaseOrderId: purchaseOrderId, 
                partnerId: partnerId, 
                context: 'Subscription Error' 
              } 
            }
          );
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: "An unexpected error occurred" });
          done();
        }, 50);
      });

      test("should handle malformed S3 file URL gracefully", (done) => {
        validateDeletionService.validatePurchaseOrderDeletion.mockResolvedValue({
          id: purchaseOrderId,
          partner_id: partnerId,
          file_url: "invalid-url-with-no-slashes"
        });
        
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith("invalid-url-with-no-slashes");
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({ message: "Purchase order successfully deleted" });
          done();
        }, 50);
      });

      test("should handle successful file deletion but failed database deletion", (done) => {
        s3Service.deleteFile.mockResolvedValue({ success: true });
        const dbError = new ValidationError("Cannot delete due to database constraints");
        purchaseOrderService.deletePurchaseOrderById.mockReturnValue(throwError(() => dbError));
        
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          expect(s3Service.deleteFile).toHaveBeenCalledWith(fileKey);
          expect(purchaseOrderService.deletePurchaseOrderById).toHaveBeenCalledWith(purchaseOrderId);
          expect(res.status).toHaveBeenCalledWith(500);
          expect(res.json).toHaveBeenCalledWith({ message: "Internal server error during deletion" });
          expect(Sentry.captureException).toHaveBeenCalled();
          done();
        }, 50);
      });
    });

    describe("Edge Cases", () => {
      test("should continue execution if Sentry.addBreadcrumb fails", (done) => {
        // Setup console.warn spy
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        
        // Mock Sentry.addBreadcrumb to throw an error
        const sentryError = new Error("Sentry service unavailable");
        Sentry.addBreadcrumb.mockImplementationOnce(() => {
          throw sentryError;
        });
        
        const testData = setupTestData({ params: { id: purchaseOrderId } });
        Object.assign(req, testData);

        controller.deletePurchaseOrderById(req, res);

        setTimeout(() => {
          // Verify console.warn was called
          expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to add Sentry breadcrumb:", sentryError);
          
          // Verify the operation still continues
          expect(validateDeletionService.validatePurchaseOrderDeletion).toHaveBeenCalledWith(partnerId, purchaseOrderId);
          
          // Clean up spy
          consoleWarnSpy.mockRestore();
          done();
        }, 50);
      });
    });
  });
});