const InvoiceService = require("../../src/services/invoice/invoiceService");
const mockInvoiceRepository = require("../../src/repositories/invoiceRepository");

jest.mock("../../src/repositories/invoiceRepository");

describe("InvoiceService - getInvoiceStatus", () => {
  let service;

  beforeEach(() => {
    service = new InvoiceService();
    jest.clearAllMocks();
  });

  test("should return the invoice status when the invoice exists and belongs to the user", async () => {
    const mockInvoice = {
      id: "test-invoice-id",
      partner_id: "test-user-id",
      status: "Analyzed",
    };

    mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

    const status = await service.getInvoiceStatus("test-invoice-id", "test-user-id");

    expect(status).toBe("Analyzed");
    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("test-invoice-id");
  });

  test("should throw an error when the invoice does not exist", async () => {
    mockInvoiceRepository.findById.mockResolvedValue(null);

    await expect(
      service.getInvoiceStatus("non-existent-invoice-id", "test-user-id")
    ).rejects.toThrow("Invoice not found");

    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("non-existent-invoice-id");
  });

  test("should throw an error when the invoice does not belong to the user", async () => {
    const mockInvoice = {
      id: "test-invoice-id",
      partner_id: "another-user-id",
      status: "Processing",
    };

    mockInvoiceRepository.findById.mockResolvedValue(mockInvoice);

    await expect(
      service.getInvoiceStatus("test-invoice-id", "test-user-id")
    ).rejects.toThrow("Unauthorized: You do not own this invoice");

    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("test-invoice-id");
  });

  test("should propagate unexpected errors", async () => {
    const unexpectedError = new Error("Database connection failed");
    mockInvoiceRepository.findById.mockRejectedValue(unexpectedError);

    await expect(
      service.getInvoiceStatus("test-invoice-id", "test-user-id")
    ).rejects.toThrow("Database connection failed");

    expect(mockInvoiceRepository.findById).toHaveBeenCalledWith("test-invoice-id");
  });
});