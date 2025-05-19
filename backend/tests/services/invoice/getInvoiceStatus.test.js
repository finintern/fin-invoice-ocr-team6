const { InvoiceService } = require('../../../src/services/invoice/invoiceService');
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');

// Create mock dependencies
const mockInvoiceRepository = {
  findById: jest.fn()
};

const mockLogger = {
  logStatusRequest: jest.fn(),
  logStatusNotFound: jest.fn(),
  logStatusError: jest.fn()
};

// Mock Sentry
jest.mock('../../../src/instrument', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn()
}));

describe('getInvoiceStatus', () => {
  let invoiceService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance of the service with mocked dependencies
    invoiceService = new InvoiceService({
      invoiceRepository: mockInvoiceRepository,
      logger: mockLogger
    });
  });

  // Helper function to test observables
  const getResult = async (observable) => {
    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: (val) => resolve(val),
        error: (err) => reject(err),
        complete: () => {}
      });
    });
  };

  test('should return invoice status for valid ID', async () => {
    // Arrange
    const invoiceId = 'test-invoice-123';
    const mockInvoice = {
      id: invoiceId,
      status: DocumentStatus.ANALYZED,
      partner_id: 'partner-abc'
    };

    mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

    // Act
    const result = await getResult(invoiceService.getInvoiceStatus(invoiceId));

    // Assert
    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
    expect(result).toEqual({
      id: invoiceId,
      status: DocumentStatus.ANALYZED
    });
    expect(mockLogger.logStatusRequest).toHaveBeenCalledWith(invoiceId, DocumentStatus.ANALYZED);
  });

  test('should return PROCESSING status when invoice is still processing', async () => {
    // Arrange
    const invoiceId = 'test-invoice-123';
    const mockInvoice = {
      id: invoiceId,
      status: DocumentStatus.PROCESSING,
      partner_id: 'partner-abc'
    };

    mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

    // Act
    const result = await getResult(invoiceService.getInvoiceStatus(invoiceId));

    // Assert
    expect(result).toEqual({
      id: invoiceId,
      status: DocumentStatus.PROCESSING
    });
    expect(mockLogger.logStatusRequest).toHaveBeenCalledWith(invoiceId, DocumentStatus.PROCESSING);
  });

  test('should return FAILED status when invoice processing failed', async () => {
    // Arrange
    const invoiceId = 'test-invoice-123';
    const mockInvoice = {
      id: invoiceId,
      status: DocumentStatus.FAILED,
      partner_id: 'partner-abc'
    };

    mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

    // Act
    const result = await getResult(invoiceService.getInvoiceStatus(invoiceId));

    // Assert
    expect(result).toEqual({
      id: invoiceId,
      status: DocumentStatus.FAILED
    });
    expect(mockLogger.logStatusRequest).toHaveBeenCalledWith(invoiceId, DocumentStatus.FAILED);
  });

  test('should throw error when invoice not found', async () => {
    // Arrange
    const invoiceId = 'non-existent-invoice';
    mockInvoiceRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(getResult(invoiceService.getInvoiceStatus(invoiceId)))
      .rejects.toThrow('Invoice not found');
    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
    expect(mockLogger.logStatusNotFound).toHaveBeenCalledWith(invoiceId);
  });

  test('should propagate repository errors', async () => {
    // Arrange
    const invoiceId = 'test-invoice-error';
    const dbError = new Error('Database connection error');
    mockInvoiceRepository.findById.mockRejectedValue(dbError);

    // Act & Assert
    await expect(getResult(invoiceService.getInvoiceStatus(invoiceId)))
      .rejects.toThrow('Failed to get invoice status: Database connection error');
    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith(invoiceId);
    expect(mockLogger.logStatusError).toHaveBeenCalledWith(invoiceId, dbError);
  });
});