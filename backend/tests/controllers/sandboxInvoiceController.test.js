const { mockRequest, mockResponse } = require("jest-mock-req-res");
const sandboxInvoiceController = require("../../src/controllers/sandboxInvoiceController");
const { AzureInvoiceMapper } = require('../../src/services/invoiceMapperService/invoiceMapperService');
const { v4: uuidv4 } = require('uuid');

// Mock the AzureInvoiceMapper
jest.mock('../../src/services/invoiceMapperService/invoiceMapperService', () => ({
  AzureInvoiceMapper: jest.fn().mockImplementation(() => ({
    mapToInvoiceModel: jest.fn().mockReturnValue({
      invoiceData: {
        invoice_number: 'INV-3337',
        invoice_date: '2016-01-25',
        due_date: '2016-01-31',
        total_amount: 93.50,
        subtotal_amount: 85.00,
        tax_amount: 8.50,
        discount_amount: null,
        currency_symbol: '$',
        currency_code: 'AUD',
        payment_terms: '30 days'
      },
      customerData: {
        name: 'Test Business',
        address: '123 Somewhere St, Melbourne, VIC 3000',
        recipient_name: 'Test Business',
        tax_id: null
      },
      vendorData: {
        name: 'DEMO - Sliced Invoices',
        address: 'Suite 5A-1204, 123 Somewhere Street, Your City AZ 12345',
        recipient_name: 'DEMO - Sliced Invoices',
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
      ]
    })
  }))
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid-value')
}));

// Mock file system operations
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({ data: 'sample data' }))
}));

// Mock console.log and console.error
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
};

describe("Sandbox Invoice Controller", () => {
  let req, res;

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    
    // Setup request and response objects
    req = mockRequest();
    res = mockResponse();
  });

  describe("mockUploadInvoice", () => {
    test("should return 400 when no file is uploaded", async () => {
      // Arrange: Set up the request without a file
      req.file = undefined;

      // Act: Call the controller method
      await sandboxInvoiceController.mockUploadInvoice(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "No file uploaded"
      });
    });

    test("should return 200 with mapped data when file is uploaded", async () => {
      // Arrange: Set up the request with a file
      req.file = {
        buffer: Buffer.from("test file content"),
        originalname: "test.pdf",
        mimetype: "application/pdf"
      };

      // Act: Call the controller method
      await sandboxInvoiceController.mockUploadInvoice(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.objectContaining({
          message: "Invoice upload initiated",
          id: 'mocked-uuid-value',
          status: "Processing"
        })
      }));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SANDBOX] Mock invoice upload initiated"));
      expect(uuidv4).toHaveBeenCalled();
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
      await sandboxInvoiceController.mockUploadInvoice(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in sandbox invoice processing"
      }));
      expect(console.error).toHaveBeenCalledWith("[SANDBOX] Error in mock invoice upload:", expect.any(Error));
    });
  });

  describe("mockGetInvoiceStatus", () => {
    test("should return 200 with mocked status", async () => {
      // Arrange: Set up the request with an ID
      req.params = { id: "test-invoice-id" };

      // Act: Call the controller method
      await sandboxInvoiceController.mockGetInvoiceStatus(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: "test-invoice-id",
        status: "Analyzed"
      });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SANDBOX] Mock get invoice status for ID"));
    });
    
    test("should handle errors properly", async () => {
      // Arrange: Setup to throw an error
      req.params = { id: "test-invoice-id" };
      
      // Mock console.log to throw an error
      console.log.mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      // Act: Call the controller method
      await sandboxInvoiceController.mockGetInvoiceStatus(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in sandbox invoice status retrieval"
      }));
      expect(console.error).toHaveBeenCalledWith("[SANDBOX] Error in mock get invoice status:", expect.any(Error));
    });
  });

  describe("mockGetInvoiceById", () => {
    test("should return 200 with mocked invoice data", async () => {
      // Arrange: Set up the request with an ID
      req.params = { id: "test-invoice-id" };

      // Act: Call the controller method
      await sandboxInvoiceController.mockGetInvoiceById(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          documents: expect.arrayContaining([
            expect.objectContaining({
              header: expect.objectContaining({
                invoice_details: expect.objectContaining({
                  invoice_number: 'INV-3337'
                })
              })
            })
          ]),
          documentUrl: expect.stringContaining("test-invoice-id")
        })
      }));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining("[SANDBOX] Mock get invoice details for ID"));
    });
    
    test("should handle errors properly", async () => {
      // Arrange: Setup to throw an error
      req.params = { id: "test-invoice-id" };
      
      // Mock the AzureInvoiceMapper to throw an error when attempting to map data
      const mockError = new Error("Test error");
      AzureInvoiceMapper.mockImplementationOnce(() => {
        throw mockError;
      });

      // Act: Call the controller method
      await sandboxInvoiceController.mockGetInvoiceById(req, res);

      // Assert: Check the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: "Error in sandbox invoice details retrieval"
      }));
      expect(console.error).toHaveBeenCalledWith("[SANDBOX] Error in mock get invoice details:", expect.any(Error));
    });
  });
});
