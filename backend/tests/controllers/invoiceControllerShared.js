const { mockRequest, mockResponse } = require("jest-mock-req-res");
const { InvoiceController } = require("../../src/controllers/invoiceController");
const pdfValidationService = require("../../src/services/pdfValidationService");

// Mock services at module level
jest.mock("../../src/services/pdfValidationService");

/**
 * Setup test data with optional overrides
 */
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

/**
 * Create mock services
 */
const createMockServices = () => {
    const mockInvoiceService = {
        uploadInvoice: jest.fn().mockResolvedValue({
            message: "Invoice upload success",
            invoiceId: "123"
        }),
        getInvoiceById: jest.fn(),
        getPartnerId: jest.fn(),
        deleteInvoiceById: jest.fn(),
        getInvoiceStatus: jest.fn()
    };

    const mockValidateDeletionService = {
        validateInvoiceDeletion: jest.fn()
    };

    const mockStorageService = {
        deleteFile: jest.fn().mockResolvedValue({ success: true })
    };

    return {
        mockInvoiceService,
        mockValidateDeletionService,
        mockStorageService
    };
};

/**
 * Create controller with mocked dependencies
 */
const createController = (mockServices) => {
    return new InvoiceController({
        invoiceService: mockServices.mockInvoiceService,
        validateDeletionService: mockServices.mockValidateDeletionService,
        storageService: mockServices.mockStorageService
    });
};

/**
 * Setup common test environment
 */
const setupTestEnvironment = () => {
    const req = mockRequest();
    const res = mockResponse();
    const mockServices = createMockServices();
    const controller = createController(mockServices);

    // Setup default mock behavior
    pdfValidationService.allValidations.mockResolvedValue(true);
    jest.clearAllMocks();

    return {
        req,
        res,
        controller,
        ...mockServices
    };
};

module.exports = {
    setupTestData,
    createMockServices,
    createController,
    setupTestEnvironment,
    pdfValidationService
};