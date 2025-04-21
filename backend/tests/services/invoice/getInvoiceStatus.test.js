const invoiceService = require("../../../src/services/invoice/invoiceService");
const InvoiceRepository = require("../../../src/repositories/invoiceRepository");

jest.mock("../../../src/repositories/invoiceRepository", () => {
  return jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
  }));
});

describe("InvoiceService - getInvoiceStatus", () => {
  let mockInvoiceRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoiceRepository = new InvoiceRepository();
    invoiceService.invoiceRepository = mockInvoiceRepository; // Inject the mocked repository
  });

  test("should return the invoice status when the invoice exists and belongs to the user", async () => {
    const mockInvoice = {
      id: "test-invoice-id",
      partner_id: "test-user-id",
      status: "Analyzed",
    };

    mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

    const status = await invoiceService.getInvoiceStatus("test-invoice-id", "test-user-id");

    expect(status).toBe("Analyzed");
    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("test-invoice-id");
  });

  test("should throw an error when the invoice does not exist", async () => {
    mockInvoiceRepository.findById.mockResolvedValue(null);

    await expect(
      invoiceService.getInvoiceStatus("non-existent-invoice-id", "test-user-id")
    ).rejects.toThrow("Invoice not found");

    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("non-existent-invoice-id");
  });

  test("should propagate unexpected errors", async () => {
    const unexpectedError = new Error("Database connection failed");
    mockInvoiceRepository.findById.mockRejectedValue(unexpectedError);

    await expect(
      invoiceService.getInvoiceStatus("test-invoice-id", "test-user-id")
    ).rejects.toThrow("Database connection failed");

    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("test-invoice-id");
  });
});