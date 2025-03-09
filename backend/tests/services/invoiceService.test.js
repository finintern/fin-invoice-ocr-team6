const invoiceService = require('../../src/services/invoiceService');
const s3Service = require('../../src/services/s3Service');
const { Invoice } = require('../../src/models')
const fs = require("fs");
const path = require("path");
const mockFs = require("mock-fs");
const { DocumentAnalysisClient } = require("@azure/ai-form-recognizer");

jest.mock("@azure/ai-form-recognizer");

jest.mock('../../src/services/s3Service', () => ({
  uploadFile: jest.fn()
}));

jest.mock('../../src/models', () => ({
  Invoice: {
    findByPk: jest.fn(),
    create: jest.fn(), 
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

describe('uploadInvoice', () => {
  const TEST_FILE_PATH = path.join(__dirname, '..', 'controllers', 'test-files', 'test-invoice.pdf');
  const TEST_FILE = { buffer: fs.readFileSync(TEST_FILE_PATH) };
  const TEST_S3_URL = 'https://s3.amazonaws.com/test-bucket/test-file.pdf';

  let mockParams, mockPartnerId, mockClient;
  let originalAnalyzeInvoice;
  
  beforeEach(() => {
    // Simpan original method sebelum di-mock
    originalAnalyzeInvoice = invoiceService.analyzeInvoice;
    
    mockPartnerId = '123';
    mockParams = { 
      buffer: TEST_FILE.buffer, 
      partnerId: mockPartnerId,
      originalname: 'test-invoice.pdf'
    };
    jest.clearAllMocks();

    mockClient = {
      beginAnalyzeDocument: jest.fn().mockResolvedValue({
        pollUntilDone: jest.fn().mockResolvedValue(null),
      }),
    };
    
    // Tambahkan mock untuk azureMapper
    invoiceService.azureMapper = {
      mapToInvoiceModel: jest.fn().mockReturnValue({
        invoice_number: 'INV-001',
        invoice_date: '2023-01-01',
        due_date: '2023-02-01',
        total_amount: 1000,
        status: 'Analyzed'
      })
    };

    // Mock untuk analyzeInvoice
    invoiceService.analyzeInvoice = jest.fn().mockResolvedValue({
      data: {
        invoices: [
          {
            invoiceId: 'INV-001',
            invoiceDate: '2023-01-01',
            dueDate: '2023-02-01',
            totalAmount: 1000
          }
        ]
      },
      message: "PDF processed successfully"
    });
    DocumentAnalysisClient.mockImplementation(() => mockClient);
  });
  
  // PENTING: Kembalikan method original SETELAH SETIAP TEST
  afterEach(() => {
    invoiceService.analyzeInvoice = originalAnalyzeInvoice;
    jest.restoreAllMocks();
  });

  test('should return invoice object when upload is successful', async () => {
    s3Service.uploadFile.mockResolvedValue(TEST_S3_URL);
    const mockInvoiceData = {
      id: 1,
      partner_id: mockPartnerId,
      file_url: TEST_S3_URL,
      status: "Processing",
      invoice_number: 'INV-001',
      invoice_date: '2023-01-01',
      due_date: '2023-02-01',
      total_amount: 1000,
      created_at: new Date()
    };

    Invoice.create.mockResolvedValue(mockInvoiceData);
    Invoice.update.mockResolvedValue([1]);

    const result = await invoiceService.uploadInvoice(mockParams);
    expect(s3Service.uploadFile).toHaveBeenCalledWith(TEST_FILE.buffer);
    expect(Invoice.create).toHaveBeenCalledWith({
      partner_id: mockPartnerId,
      file_url: TEST_S3_URL,
      status: "Processing"
    });
    expect(result).toHaveProperty('message', 'Invoice successfully processed and saved');
  });

  test('should raise error when S3 upload fails', async () => {
    s3Service.uploadFile.mockRejectedValue(new Error('Failed to upload file to S3'));

    await expect(invoiceService.uploadInvoice(mockParams)).rejects.toThrow('Failed to upload file to S3');
  });

  test('should raise error when saving to database fails', async () => {
    s3Service.uploadFile.mockResolvedValue(TEST_S3_URL);
    Invoice.create.mockRejectedValue(new Error('Failed to save invoice to database'));

    await expect(invoiceService.uploadInvoice(mockParams)).rejects.toThrow('Failed to save invoice to database');
  });
});

describe('uploadInvoice - Corner Cases', () => {
  let originalAnalyzeInvoice;

  beforeEach(() => {
    originalAnalyzeInvoice = invoiceService.analyzeInvoice;
    jest.clearAllMocks();
  });

  afterEach(() => {
    invoiceService.analyzeInvoice = originalAnalyzeInvoice;
    jest.restoreAllMocks();
  });
  
  test('should throw error when fileData is null', async () => {
    await expect(invoiceService.uploadInvoice(null)).rejects.toThrow('File not found');
  });
  
  test('should throw error when partnerId is missing', async () => {
    const mockParams = { 
      buffer: Buffer.from('test'),
      originalname: 'test.pdf'
      // partnerId intentionally missing
    };
    
    await expect(invoiceService.uploadInvoice(mockParams)).rejects.toThrow('Partner ID is required');
  });

  test('should throw error when s3 upload returns null url', async () => {
    const mockParams = { 
      buffer: Buffer.from('test'),
      originalname: 'test.pdf',
      partnerId: '123'
    };
    
    s3Service.uploadFile.mockResolvedValue(null);
    
    await expect(invoiceService.uploadInvoice(mockParams)).rejects.toThrow('Failed to upload file to S3');
  });
  
  test('should handle case when azureMapper returns incomplete data', async () => {
    const mockParams = { 
      buffer: Buffer.from('test'),
      originalname: 'test.pdf',
      partnerId: '123'
    };
    
    s3Service.uploadFile.mockResolvedValue('https://example.com/test.pdf');
    
    const mockInvoice = { id: 1, status: 'Processing' };
    Invoice.create.mockResolvedValue(mockInvoice);
    
    // Mock analyzeInvoice to return valid data
    invoiceService.analyzeInvoice = jest.fn().mockResolvedValue({
      data: { someField: 'value' },
      message: "PDF processed successfully"
    });
    
    // Mock azureMapper to return incomplete data
    invoiceService.azureMapper = {
      mapToInvoiceModel: jest.fn().mockImplementation(() => {
        throw new Error("Invalid OCR result format");
      })
    };
    
    await expect(invoiceService.uploadInvoice(mockParams)).rejects.toThrow('Failed to process invoice: Invalid OCR result format');
    expect(Invoice.update).toHaveBeenCalledWith({ status: 'Failed' }, { where: { id: 1 }});
  });
  
  test('should throw error when analyzeInvoice returns no data', async () => {
    const mockParams = { 
      buffer: Buffer.from('test'),
      originalname: 'test.pdf',
      partnerId: '123'
    };
    
    s3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/test-bucket/test-file.pdf');
    
    const mockInvoiceData = {
      id: 1,
      partner_id: '123',
      file_url: 'https://s3.amazonaws.com/test-bucket/test-file.pdf',
      status: "Processing"
    };
    
    Invoice.create.mockResolvedValue(mockInvoiceData);
    
    // Mock analyzeInvoice to return a response without data
    invoiceService.analyzeInvoice = jest.fn().mockResolvedValue({ 
      message: "PDF processed successfully"
      // No data property
    });
    
    await expect(invoiceService.uploadInvoice(mockParams))
      .rejects.toThrow('Failed to process invoice: Failed to analyze invoice: No data returned');
    
    expect(Invoice.update).toHaveBeenCalledWith(
      { status: "Failed" },
      { where: { id: 1 }}
    );
  });
  
});



describe("getInvoiceById", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Should return an invoice when given a valid ID", async () => {
    const mockInvoice = {
      id: 1,
      invoice_date: "2025-02-01",
      due_date: "2025-03-01",
      purchase_order_id: 1,
      total_amount: 500.00,
      subtotal_amount: 450.00,
      discount_amount: 50.00,
      payment_terms: "Net 30",
      file_url: 'https://example.com/invoice.pdf',
      status: "Analyzed",
    };

    Invoice.findByPk.mockResolvedValue(mockInvoice);

    const invoice = await invoiceService.getInvoiceById(1);

    expect(invoice).toEqual(mockInvoice);
  });

  test("Should throw an error when invoice is not found", async () => {
    Invoice.findByPk.mockResolvedValue(null);

    await expect(invoiceService.getInvoiceById(99999999)).rejects.toThrow("Invoice not found");
  });

  test("Should throw an error when database fails", async () => {
    Invoice.findByPk.mockRejectedValue(new Error("Database error"));

        await expect(invoiceService.getInvoiceById(1)).rejects.toThrow("Database error");
    });
});

describe("deleteInvoiceById", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should delete an existing invoice (positive case)", async () => {
    jest.spyOn(Invoice, "destroy").mockResolvedValue(1);
    
    await expect(invoiceService.deleteInvoiceById(1)).resolves.toEqual({
      message: "Invoice successfully deleted"
    });
  });

  test("should throw an error when invoice does not exist (negative case)", async () => {
    jest.spyOn(Invoice, "destroy").mockResolvedValue(0);
    
    await expect(invoiceService.deleteInvoiceById(999)).rejects.toThrow("Failed to delete invoice");
  });

  test("should handle database errors (edge case: DB failure)", async () => {
    jest.spyOn(Invoice, "destroy").mockRejectedValue(new Error("Database error"));
    
    await expect(invoiceService.deleteInvoiceById(1)).rejects.toThrow("Failed to delete invoice: Database error");
  });
});

describe("Invoice Analysis Service", () => {
  const documentUrl = "https://slicedinvoices.com/pdf/wordpress-pdf-invoice-plugin-sample.pdf";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Positive Cases", () => {
    test("should successfully process a valid PDF", async () => {
      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockResolvedValue({
          pollUntilDone: jest.fn().mockResolvedValue({ success: true }),
        }),
      };

      DocumentAnalysisClient.mockImplementation(() => mockClient);

      const result = await invoiceService.analyzeInvoice(documentUrl);
      expect(result).toEqual({
        message: "PDF processed successfully",
        data: { success: true },
      });
    });
  });

  describe("Negative Cases", () => {
    test("should throw an error if documentUrl is missing", async () => {
      await expect(invoiceService.analyzeInvoice()).rejects.toThrow("documentUrl is required");
    });

    test("should throw 'Service is temporarily unavailable' if API returns 503", async () => {
      const mockError = new Error("Service Unavailable");
      mockError.statusCode = 503;

      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockRejectedValue(mockError),
      };

      DocumentAnalysisClient.mockImplementation(() => mockClient);

      await expect(invoiceService.analyzeInvoice(documentUrl)).rejects.toThrow(
        "Service is temporarily unavailable. Please try again later."
      );
    });

    test("should throw 'Conflict error occurred' if API returns 409", async () => {
      const mockError = new Error("Conflict Error");
      mockError.statusCode = 409;

      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockRejectedValue(mockError),
      };

      DocumentAnalysisClient.mockImplementation(() => mockClient);

      await expect(invoiceService.analyzeInvoice(documentUrl)).rejects.toThrow(
        "Conflict error occurred. Please check the document and try again."
      );
    });

    test("should throw 'Failed to process the document' for any other API error", async () => {
      const mockError = new Error("Unknown Error");
      mockError.statusCode = 500;

      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockRejectedValue(mockError),
      };

      DocumentAnalysisClient.mockImplementation(() => mockClient);

      await expect(invoiceService.analyzeInvoice(documentUrl)).rejects.toThrow(
        "Failed to process the document"
      );
    });
  });

  describe("Corner Cases", () => {
    test("should handle empty response from API gracefully", async () => {
      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockResolvedValue({
          pollUntilDone: jest.fn().mockResolvedValue(null),
        }),
      };

      DocumentAnalysisClient.mockImplementation(() => mockClient);

      const result = await invoiceService.analyzeInvoice(documentUrl);
      expect(result).toEqual({
        message: "PDF processed successfully",
        data: null,
      });
    });

    test("should handle API response with missing fields", async () => {
      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockResolvedValue({
          pollUntilDone: jest.fn().mockResolvedValue({}),
        }),
      };

      DocumentAnalysisClient.mockImplementation(() => mockClient);

      const result = await invoiceService.analyzeInvoice(documentUrl);
      expect(result).toEqual({
        message: "PDF processed successfully",
        data: {},
      });
    });
    test('should process buffer input correctly', async () => {
      const bufferInput = Buffer.from('test pdf content');
      
      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockResolvedValue({
          pollUntilDone: jest.fn().mockResolvedValue({ key: 'value' }),
        }),
      };
  
      DocumentAnalysisClient.mockImplementation(() => mockClient);
      
      const result = await invoiceService.analyzeInvoice(bufferInput);
      
      expect(mockClient.beginAnalyzeDocument).toHaveBeenCalledWith(
        process.env.AZURE_INVOICE_MODEL || expect.any(String), 
        bufferInput
      );
      
      expect(result).toEqual({
        message: 'PDF processed successfully',
        data: { key: 'value' }
      });
    });
    test('should throw error for invalid document source type', async () => {
      const invalidInput = { notValid: true };
      
      await expect(invoiceService.analyzeInvoice(invalidInput)).rejects.toThrow('Invalid document source type');
    });

    test('should throw error for invalid date format', async () => {
      const mockError = new Error('Invalid date format');
      
      const mockClient = {
        beginAnalyzeDocument: jest.fn().mockRejectedValue(mockError),
      };
  
      DocumentAnalysisClient.mockImplementation(() => mockClient);
      
      await expect(invoiceService.analyzeInvoice('test-url')).rejects.toThrow('Invoice contains invalid date format');
    });
  });
});