const { PayloadTooLargeError, UnsupportedMediaTypeError } = require("../../src/utils/errors");
const {
    setupTestData,
    setupTestEnvironment,
    pdfValidationService
} = require("./invoiceControllerShared");

describe("Invoice Controller - uploadInvoice", () => {
    let req, res, controller, mockInvoiceService;

    beforeEach(() => {
        const testEnv = setupTestEnvironment();
        req = testEnv.req;
        res = testEnv.res;
        controller = testEnv.controller;
        mockInvoiceService = testEnv.mockInvoiceService;
    });

    describe("successful upload scenarios", () => {
        test("should successfully upload when all validations pass", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: {
                    message: "Invoice upload success",
                    invoiceId: "123"
                }
            });
        });

        test("should successfully upload with skipAnalysis set to true", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = { 'skipAnalysis': 'true' };

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.objectContaining({
                    buffer: expect.any(Buffer),
                    originalname: "test.pdf",
                    mimetype: "application/pdf",
                    partnerId: "test-uuid"
                }),
                true
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("should handle skipAnalysis parameter with space in name", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = { 'skipAnalysis ': 'true' };

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.objectContaining({
                    buffer: expect.any(Buffer),
                    originalname: "test.pdf",
                    mimetype: "application/pdf",
                    partnerId: "test-uuid"
                }),
                true
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("should default skipAnalysis to false when not provided", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.objectContaining({
                    buffer: expect.any(Buffer),
                    originalname: "test.pdf",
                    mimetype: "application/pdf",
                    partnerId: "test-uuid"
                }),
                false
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("should handle skipAnalysis with value other than 'true' as false", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = { skipAnalysis: 'yes' };

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.any(Object),
                false
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe("error scenarios", () => {
        test("should return 401 when user is not authenticated", async () => {
            const testData = setupTestData({ user: undefined });
            Object.assign(req, testData);

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Unauthorized"
            });
        });

        test("should return 400 when no file uploaded", async () => {
            const testData = setupTestData({ file: undefined });
            Object.assign(req, testData);

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "No file uploaded"
            });
        });

        test("should return 400 when PDF validation fails", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            pdfValidationService.allValidations.mockRejectedValue(new Error("Invalid PDF"));

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid PDF"
            });
        });

        test("should handle timeout and return 504", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            // Use fake timers for timeout test
            jest.useFakeTimers();

            mockInvoiceService.uploadInvoice.mockImplementation(() =>
                new Promise(() => { }) // Promise that never resolves
            );

            const promise = controller.uploadInvoice(req, res);

            // Fast-forward time
            jest.advanceTimersByTime(4000);

            await promise;

            expect(res.status).toHaveBeenCalledWith(504);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server timeout - upload processing timed out"
            });

            jest.useRealTimers();
        });

        test("should return 500 for unexpected internal server errors", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.uploadInvoice.mockRejectedValue(new Error("Internal server error"));

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error"
            });
        });

        test("should return 413 when file is too large", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            pdfValidationService.allValidations.mockRejectedValue(
                new PayloadTooLargeError("File size exceeds 20MB limit")
            );

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(413);
            expect(res.json).toHaveBeenCalledWith({
                message: "File size exceeds 20MB limit"
            });
        });

        test("should return 415 when file is not PDF", async () => {
            const testData = setupTestData({
                file: {
                    buffer: Buffer.from("test"),
                    originalname: "test.jpg",
                    mimetype: "image/jpeg"
                }
            });
            Object.assign(req, testData);

            pdfValidationService.allValidations.mockRejectedValue(
                new UnsupportedMediaTypeError("Only PDF files are allowed")
            );

            await controller.uploadInvoice(req, res);

            expect(res.status).toHaveBeenCalledWith(415);
            expect(res.json).toHaveBeenCalledWith({
                message: "Only PDF files are allowed"
            });
        });
    });

    describe("skipAnalysis edge cases", () => {
        test("should handle undefined req.body and default skipAnalysis to false", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = undefined;

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.any(Object),
                false
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("should handle null req.body and default skipAnalysis to false", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = null;

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.any(Object),
                false
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("should handle non-object req.body and default skipAnalysis to false", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = "not an object";

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.any(Object),
                false
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        test("should handle empty object req.body and default skipAnalysis to false", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);
            req.body = {};

            await controller.uploadInvoice(req, res);

            expect(mockInvoiceService.uploadInvoice).toHaveBeenCalledWith(
                expect.any(Object),
                false
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});