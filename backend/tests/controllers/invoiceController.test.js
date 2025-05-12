const { InvoiceController } = require("../../src/controllers/invoiceController");
const pdfValidationService = require("../../src/services/pdfValidationService");

// Jest-mock-req-res untuk unit test
const { mockRequest, mockResponse } = require("jest-mock-req-res");
const { PayloadTooLargeError, UnsupportedMediaTypeError, NotFoundError } = require("../../src/utils/errors");

// Mock services
jest.mock("../../src/services/pdfValidationService");
// jest.mock("../../src/services/invoiceService");

describe("Invoice Controller", () => {
  let req, res, controller, mockInvoiceService;

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

    mockInvoiceService = {
      uploadInvoice: jest.fn().mockResolvedValue({
        message: "Invoice upload success",
        invoiceId: "123"
      }),
      getInvoiceById: jest.fn(),
      getPartnerId: jest.fn(),
      deleteInvoiceById: jest.fn(),  // Add this method that might be needed
      getInvoiceStatus: jest.fn()
    };

    // Create mock services for other dependencies
    const mockValidateDeletionService = {
      validateInvoiceDeletion: jest.fn()
    };

    const mockStorageService = {
      deleteFile: jest.fn().mockResolvedValue({ success: true })
    };

    // Change this line to pass a dependencies object
    controller = new InvoiceController({
      invoiceService: mockInvoiceService,
      validateDeletionService: mockValidateDeletionService,
      storageService: mockStorageService
    });

    pdfValidationService.allValidations.mockResolvedValue(true);
    jest.clearAllMocks();
  });

  describe("getInvoiceById", () => {
    // Mock RxJS untuk pengujian
    const rxjs = require('rxjs');
  
    // Setup fungsi untuk mengamati hasil observable agar bisa di-test
    const waitForObservable = () => {
      return new Promise(resolve => {
        // Wait a bit for observable to complete
        setTimeout(resolve, 50);
      });
    };
  
    beforeEach(() => {
      // Mock from agar tidak perlu mengeksekusi promise/observable asli
      jest.spyOn(rxjs, 'from').mockImplementation((input) => {
        if (typeof input.then === 'function') {
          // Handle promise input
          return {
            pipe: jest.fn().mockReturnThis(),
            subscribe: (observer) => {
              input.then(
                (val) => {
                  if (observer.next) observer.next(val);
                  if (observer.complete) observer.complete();
                },
                (err) => {
                  if (observer.error) observer.error(err);
                }
              );
              return { unsubscribe: jest.fn() };
            }
          };
        }
        return rxjs.of(input);
      });
    });
  
    afterEach(() => {
      jest.restoreAllMocks();
    });
  
    test("should return invoice when authorized", async () => {
      const mockInvoice = {
        id: 1,
        partnerId: "test-uuid",
        total: 100
      };
      const testData = setupTestData();
      Object.assign(req, testData);
  
      mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
      mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.of(mockInvoice));
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockInvoice);
    });
  
    test("should return 401 when user is not authenticated", async () => {
      const testData = setupTestData({ user: undefined });
      Object.assign(req, testData);
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized"
      });
    });
  
    test("should return 403 when accessing another user's invoice", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);
  
      mockInvoiceService.getPartnerId.mockResolvedValue("other-uuid");
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Forbidden: You do not have access to this invoice"
      });
    });
  
    test("should return 404 when invoice not found", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);
  
      mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
      mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.of(null)); // Return null for invoice not found
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invoice not found"
      });
    });
  
    test("should return 500 for unexpected internal server errors", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);
  
      // Error dalam validateGetRequest
      mockInvoiceService.getPartnerId.mockRejectedValue(new Error("Internal server error"));
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error"
      });
    });
  
    test("should return 400 when invoice ID is null", async () => {
      const testData = setupTestData({ params: { id: null } });
      Object.assign(req, testData);
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invoice ID is required"
      });
    });
  
    test("should handle errors from getInvoiceById service", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);
  
      mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
      // Simulasi error dari service yang dikembalikan sebagai observable
      mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.throwError(() => new Error("Failed to get invoice")));
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error"
      });
    });
  
    test("should handle NotFoundError from getInvoiceById service correctly", async () => {
      const testData = setupTestData();
      Object.assign(req, testData);
  
      mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
      
      // Buat NotFoundError
      const notFoundError = new NotFoundError("Invoice not found");
      mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.throwError(() => notFoundError));
  
      controller.getInvoiceById(req, res);
      await waitForObservable();
  
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invoice not found"
      });
    });
  });

  describe("getInvoiceStatus", () => {
    test("should return invoice status when authorized", async () => {
      // Arrange
      const mockStatus = {
        id: "1",
        status: "ANALYZED"
      };
      const testData = setupTestData();
      Object.assign(req, testData);

      mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
      mockInvoiceService.getInvoiceStatus.mockResolvedValue(mockStatus);

      // Act
      await controller.getInvoiceStatus(req, res);

      // Assert
      expect(mockInvoiceService.getPartnerId).toHaveBeenCalledWith("1");
      expect(mockInvoiceService.getInvoiceStatus).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStatus);
    });

    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const testData = setupTestData({ user: undefined });
      Object.assign(req, testData);

      // Act
      await controller.getInvoiceStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized"
      });
      expect(mockInvoiceService.getInvoiceStatus).not.toHaveBeenCalled();
    });

    test("should return 400 when invoice ID is missing", async () => {
      // Arrange
      const testData = setupTestData({ params: {} });
      Object.assign(req, testData);

      // Act
      await controller.getInvoiceStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invoice ID is required"
      });
      expect(mockInvoiceService.getInvoiceStatus).not.toHaveBeenCalled();
    });

    test("should return 403 when accessing another user's invoice", async () => {
      // Arrange
      const testData = setupTestData();
      Object.assign(req, testData);

      mockInvoiceService.getPartnerId.mockResolvedValue("other-uuid");

      // Act
      await controller.getInvoiceStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Forbidden: You do not have access to this invoice"
      });
      expect(mockInvoiceService.getInvoiceStatus).not.toHaveBeenCalled();
    });

    test("should handle invoice not found error", async () => {
      // Arrange
      const testData = setupTestData();
      Object.assign(req, testData);

      mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
      // Use NotFoundError instead of generic Error
      mockInvoiceService.getInvoiceStatus.mockRejectedValue(new NotFoundError("Invoice not found"));

      // Act
      await controller.getInvoiceStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invoice not found"
      });
    });

  });
});