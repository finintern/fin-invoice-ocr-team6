const { mockRequest, mockResponse } = require("jest-mock-req-res");
const { PurchaseOrderController } = require("../../src/controllers/purchaseOrderController");
const purchaseOrderService = require("../../src/services/purchaseOrder/purchaseOrderService");
const pdfValidationService = require("../../src/services/pdfValidationService");
const authService = require("../../src/services/authService");
const { getPurchaseOrderById } = require('../../src/controllers/purchaseOrderController');

jest.mock("../../src/services/purchaseOrder/purchaseOrderService");
jest.mock("../../src/services/pdfValidationService");

describe("Purchase Order Controller", () => {
  let req, res, controller;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    controller = new PurchaseOrderController(purchaseOrderService);
    jest.clearAllMocks();

    // Default mocks
    pdfValidationService.allValidations.mockResolvedValue(true);    

    purchaseOrderService.uploadPurchaseOrder.mockResolvedValue({
      message: "Purchase order uploaded successfully",
      id: "123"
    });
  });

  describe("uploadPurchaseOrder", () => {
    test("should successfully upload when all validations pass", async () => {
      req.user = { uuid: "test-uuid" };
      req.file = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

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

    test("should return 401 when unauthorized", async () => {
      req.user = undefined;
      req.file = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Unauthorized"
      });
      expect(purchaseOrderService.uploadPurchaseOrder).not.toHaveBeenCalled();
    });

    test("should return 400 when no file uploaded", async () => {
      req.user = { uuid: "test-uuid" };
      req.file = undefined;

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No file uploaded"
      });
    });

    test("should handle timeout", async () => {
      req.user = { uuid: "test-uuid" };
      req.file = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

      purchaseOrderService.uploadPurchaseOrder.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 4000))
      );

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server timeout - upload processing timed out"
      });
    });

    test("should handle PDF validation errors", async () => {
      req.user = { uuid: "test-uuid" };
      req.file = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

      pdfValidationService.allValidations.mockRejectedValue(
        new Error("PDF validation failed")
      );

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "PDF validation failed"
      });
    });

    test("should handle service errors", async () => {
      req.user = { uuid: "test-uuid" };
      req.file = {
        buffer: Buffer.from("test"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

      purchaseOrderService.uploadPurchaseOrder.mockRejectedValue(
        new Error("Service error")
      );

      await controller.uploadPurchaseOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Internal server error"
      });
    });
  });
  
  test("should handle generic error when validatePdfPageCount fails", async () => {
    req.user = { uuid: "dummy-uuid" };
    req.file = {
      originalname: "test.pdf",
      buffer: Buffer.from("%PDF-"),
      mimetype: "application/pdf",
    };
  
    // Mock general error
    pdfValidationService.validatePdfPageCount.mockRejectedValue(
      new Error("Some unexpected error")
    );
  
    await purchaseOrderController.uploadPurchaseOrder(req, res);
  
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ 
      message: "Failed to determine PDF page count." 
    });
  });


});

describe("getPurchaseOrderById (Controller)", () => {
  let req, res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  test("Should return 400 if ID is missing", async () => {
    req.params = {};
    req.user = { uuid: "partner-uuid" };

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Purchase Order ID is required" });
  });

  test("Should return 401 if user is not authenticated", async () => {
    req.params = { id: "po-uuid" };
    req.user = undefined;

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  test("Should return 403 if PO does not belong to the user", async () => {
    req.params = { id: "po-uuid" };
    req.user = { uuid: "wrong-user" };

    purchaseOrderService.getPartnerId.mockResolvedValue("actual-owner");

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: You do not have access to this purchase order"
    });
  });

  test("Should return 404 if PO is not found", async () => {
    req.params = { id: "not-found-id" };
    req.user = { uuid: "partner-uuid" };

    purchaseOrderService.getPartnerId.mockResolvedValue("partner-uuid");
    purchaseOrderService.getPurchaseOrderById.mockRejectedValue(new Error("Purchase order not found"));

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Purchase order not found" });
  });

  test("Should return 500 if unexpected error occurs", async () => {
    req.params = { id: "some-id" };
    req.user = { uuid: "partner-uuid" };

    purchaseOrderService.getPartnerId.mockRejectedValue(new Error("DB is down"));

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });

  test("Should return 200 and the PO detail if all is valid", async () => {
    req.params = { id: "po-uuid" };
    req.user = { uuid: "partner-uuid" };

    const mockPO = { id: "po-uuid", header: {}, items: [] };

    purchaseOrderService.getPartnerId.mockResolvedValue("partner-uuid");
    purchaseOrderService.getPurchaseOrderById.mockResolvedValue(mockPO);

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPO);
  });

  test("Should return 200 and resolve customer and vendor when IDs are present", async () => {
    req.params = { id: "po-with-customer-vendor" };
    req.user = { uuid: "partner-uuid" };

    const mockPO = {
      id: "po-with-customer-vendor",
      header: { invoice_details: { purchase_order_id: "PO-2025-001" } },
      items: [],
      customer_id: "cust-uuid",
      vendor_id: "vend-uuid"
    };

    purchaseOrderService.getPartnerId.mockResolvedValue("partner-uuid");
    purchaseOrderService.getPurchaseOrderById.mockImplementation(async () => {
      // You could assert or track internal service calls if needed
      return mockPO;
    });

    await getPurchaseOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPO);
  });
});

});
