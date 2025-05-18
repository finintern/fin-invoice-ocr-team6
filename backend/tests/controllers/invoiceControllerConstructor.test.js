const { InvoiceController } = require("../../src/controllers/invoiceController");

describe("Invoice Controller - Constructor", () => {
    describe("constructor validation", () => {
        test("should throw error when invalid service is provided", () => {
            // Case 1: No dependencies provided
            expect(() => {
                new InvoiceController();
            }).toThrow('Invalid invoice service provided');

            // Case 2: No invoiceService provided
            expect(() => {
                new InvoiceController({});
            }).toThrow('Invalid invoice service provided');

            // Case 3: invoiceService with non-function uploadInvoice
            expect(() => {
                new InvoiceController({
                    invoiceService: { uploadInvoice: "not a function" }
                });
            }).toThrow('Invalid invoice service provided');
        });

        test("should not throw error when valid service is provided", () => {
            const validService = {
                uploadInvoice: jest.fn()
            };

            expect(() => {
                new InvoiceController({
                    invoiceService: validService,
                    validateDeletionService: {},
                    storageService: {}
                });
            }).not.toThrow();
        });
    });
});