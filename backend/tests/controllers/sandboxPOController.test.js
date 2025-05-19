const { mockRequest, mockResponse } = require("jest-mock-req-res");
const sandboxController = require("../../src/controllers/sandboxPOController");
const { AzurePurchaseOrderMapper } = require('../../src/services/purchaseOrderMapperService/purchaseOrderMapperService');

// Mock the AzurePurchaseOrderMapper
jest.mock('../../src/services/purchaseOrderMapperService/purchaseOrderMapperService', () => ({
  AzurePurchaseOrderMapper: jest.fn().mockImplementation(() => ({
    mapToPurchaseOrderModel: jest.fn().mockReturnValue({
      purchaseOrderData: {
        po_number: 'PO-12345',
        payment_terms: '30 days',
        total_amount: 93.50,
        subtotal_amount: 85.00,
        tax_amount: 8.50,
        discount_amount: null,
        currency_symbol: '$',
        currency_code: 'USD'
      },
      customerData: {
        name: 'Test Business',
        contact_name: 'Test Business',
        address: '123 Somewhere St, Melbourne, VIC 3000',
        tax_id: null
      },
      vendorData: {
        name: 'DEMO - Sliced Invoices',
        contact_name: 'DEMO - Sliced Invoices',
        address: 'Suite 5A-1204, 123 Somewhere Street, Your City AZ 12345',
        tax_id: null
      },
      itemsData: [
        {
          description: 'Web Design This is a sample description ...',
          quantity: 1,
          unit: null,
          unitPrice: 85,
          amount: 85
        }
      ],
      data: {
        purchaseOrderDate: '2023-01-01',
        due_date: '2023-01-31'
      }
    })
  }))
}));

// Mock console.log and console.error
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
};

describe("Sandbox Controller", () => {
  let req, res;

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = mockRequest();
    res = mockResponse();
  });

  describe("mockUploadPurchaseOrder", () => {
    test("should return 400 when no file is uploaded", async () => {
      // Arrange: Set up the request without a file
      req.file = undefined;

      // Act: Call the controller method
      await sandboxController.mockUploadPurchaseOrder(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No file uploaded"
      });
    });    test("should return 200 with mapped data when file is uploaded", async () => {
      // Arrange: Set up the request with a file
      req.file = {
        buffer: Buffer.from("test file content"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

      // Act: Call the controller method
      await sandboxController.mockUploadPurchaseOrder(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.objectContaining({
          message: "Purchase order upload processed",
          id: "123e4567-e89b-12d3-a456-426614174001",
          status: "Processing"
        })
      }));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SANDBOX] Mock purchase order upload processed"));
    });
      test("should handle errors properly", async () => {
      // Arrange: Set up the request with a file but throw an error
      req.file = {
        buffer: Buffer.from("test file content"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };
      
      // Mock console.log to throw an error
      console.log.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      // Act: Call the controller method
      await sandboxController.mockUploadPurchaseOrder(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in sandbox purchase order processing"
      }));
      expect(console.error).toHaveBeenCalledWith("[SANDBOX] Error in mock purchase order upload:", expect.any(Error));
    });
  });

  describe("mockGetPurchaseOrderStatus", () => {
    test("should return 200 with mocked status", async () => {
      // Arrange: Set up the request with an ID
      req.params = { id: "test-po-id" };

      // Act: Call the controller method
      await sandboxController.mockGetPurchaseOrderStatus(req, res);

      // Assert: Check the response      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: "test-po-id",
        status: "Analyzed"
      }));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SANDBOX] Mock get purchase order status for ID"));
    });
    
    test("should handle errors properly", async () => {
      // Arrange: Setup to throw an error
      req.params = { id: "test-po-id" };
      
      // Mock console.log to throw an error
      console.log.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      // Act: Call the controller method
      await sandboxController.mockGetPurchaseOrderStatus(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in sandbox purchase order status retrieval"
      }));
      expect(console.error).toHaveBeenCalledWith("[SANDBOX] Error in mock get purchase order status:", expect.any(Error));
    });
  });

  describe("mockGetPurchaseOrderById", () => {    test("should return 200 with mocked purchase order data", async () => {
      // Arrange: Set up the request with an ID
      req.params = { id: "test-po-id" };
      
      // Mock the mapper with a proper implementation that won't cause issues
      const mockMapperFn = jest.fn().mockReturnValue({
        purchaseOrderData: {
          po_number: 'PO-12345',
          payment_terms: '30 days',
          total_amount: 93.50,
          subtotal_amount: 85.00,
          tax_amount: 8.50,
          discount_amount: null,
          currency_symbol: '$',
          currency_code: 'USD'
        },
        vendorData: {
          name: 'DEMO - Sliced Invoices',
          contact_name: 'DEMO - Sliced Invoices',
          address: 'Suite 5A-1204, 123 Somewhere Street, Your City AZ 12345',
          tax_id: null
        },
        customerData: {
          name: 'Test Business',
          contact_name: 'Test Business',
          address: '123 Somewhere St, Melbourne, VIC 3000',
          tax_id: null
        },
        itemsData: [
          {
            description: 'Web Design This is a sample description ...',
            quantity: 1,
            unit: null,
            unitPrice: 85,
            amount: 85
          }
        ],
        data: {
          purchaseOrderDate: '2023-01-01',
          due_date: '2023-01-31'
        }
      });
      
      AzurePurchaseOrderMapper.mockImplementationOnce(() => ({
        mapToPurchaseOrderModel: mockMapperFn
      }));

      // Act: Call the controller method
      await sandboxController.mockGetPurchaseOrderById(req, res);      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          documents: expect.arrayContaining([
            expect.objectContaining({
              header: expect.objectContaining({
                purchase_order_details: expect.any(Object)
              })
            })
          ]),
          documentUrl: "https://mock-s3-url.com/purchase-order.pdf"
        })
      }));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SANDBOX] Mock get purchase order details for ID"));
    });
    
    test("should handle errors properly", async () => {
      // Arrange: Setup to throw an error
      req.params = { id: "test-po-id" };
      
      // Mock the AzurePurchaseOrderMapper to throw an error
      AzurePurchaseOrderMapper.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      // Act: Call the controller method
      await sandboxController.mockGetPurchaseOrderById(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in sandbox purchase order details retrieval"
      }));
      expect(console.error).toHaveBeenCalledWith("[SANDBOX] Error in mock get purchase order details:", expect.any(Error));
    });
  });
});