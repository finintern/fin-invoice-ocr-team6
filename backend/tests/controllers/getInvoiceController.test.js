const rxjs = require('rxjs');
const { NotFoundError } = require("../../src/utils/errors");
const {
    setupTestData,
    setupTestEnvironment
} = require("./invoiceControllerShared");

describe("Invoice Controller - Get Methods", () => {
    let req, res, controller, mockInvoiceService;

    // Setup fungsi untuk mengamati hasil observable agar bisa di-test
    const waitForObservable = () => {
        return new Promise(resolve => {
            setTimeout(resolve, 50);
        });
    };

    beforeEach(() => {
        const testEnv = setupTestEnvironment();
        req = testEnv.req;
        res = testEnv.res;
        controller = testEnv.controller;
        mockInvoiceService = testEnv.mockInvoiceService;

        // Mock from agar tidak perlu mengeksekusi promise/observable asli
        jest.spyOn(rxjs, 'from').mockImplementation((input) => {
            if (typeof input.then === 'function') {
                // Handle promise input
                return {
                    pipe: jest.fn().mockReturnThis(),
                    subscribe: (observer) => {
                        input.then(
                            (val) => {
                                if (observer.next) observer.next(val);
                                if (observer.complete) observer.complete();
                            },
                            (err) => {
                                if (observer.error) observer.error(err);
                            }
                        );
                        return { unsubscribe: jest.fn() };
                    }
                };
            }
            return rxjs.of(input);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("getInvoiceById", () => {
        test("should return invoice when authorized", async () => {
            const mockInvoice = {
                id: 1,
                partnerId: "test-uuid",
                total: 100
            };
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
            mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.of(mockInvoice));

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockInvoice);
        });

        test("should return 401 when user is not authenticated", async () => {
            const testData = setupTestData({ user: undefined });
            Object.assign(req, testData);

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Unauthorized"
            });
        });

        test("should return 403 when accessing another user's invoice", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("other-uuid");

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: "Forbidden: You do not have access to this invoice"
            });
        });

        test("should return 404 when invoice not found", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
            mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.of(null));

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invoice not found"
            });
        });

        test("should return 500 for unexpected internal server errors", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockRejectedValue(new Error("Internal server error"));

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error"
            });
        });

        test("should return 400 when invoice ID is null", async () => {
            const testData = setupTestData({ params: { id: null } });
            Object.assign(req, testData);

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invoice ID is required"
            });
        });

        test("should handle errors from getInvoiceById service", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
            mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.throwError(() => new Error("Failed to get invoice")));

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Internal server error"
            });
        });

        test("should handle NotFoundError from getInvoiceById service correctly", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
            const notFoundError = new NotFoundError("Invoice not found");
            mockInvoiceService.getInvoiceById.mockReturnValue(rxjs.throwError(() => notFoundError));

            controller.getInvoiceById(req, res);
            await waitForObservable();

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invoice not found"
            });
        });
    });

    describe("getInvoiceStatus", () => {
        test("should return invoice status when authorized", async () => {
            const mockStatus = {
                id: "1",
                status: "ANALYZED"
            };
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
            mockInvoiceService.getInvoiceStatus.mockResolvedValue(mockStatus);

            await controller.getInvoiceStatus(req, res);

            expect(mockInvoiceService.getPartnerId).toHaveBeenCalledWith("1");
            expect(mockInvoiceService.getInvoiceStatus).toHaveBeenCalledWith("1");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockStatus);
        });

        test("should return 401 when user is not authenticated", async () => {
            const testData = setupTestData({ user: undefined });
            Object.assign(req, testData);

            await controller.getInvoiceStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Unauthorized"
            });
            expect(mockInvoiceService.getInvoiceStatus).not.toHaveBeenCalled();
        });

        test("should return 400 when invoice ID is missing", async () => {
            const testData = setupTestData({ params: {} });
            Object.assign(req, testData);

            await controller.getInvoiceStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invoice ID is required"
            });
            expect(mockInvoiceService.getInvoiceStatus).not.toHaveBeenCalled();
        });

        test("should return 403 when accessing another user's invoice", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("other-uuid");

            await controller.getInvoiceStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: "Forbidden: You do not have access to this invoice"
            });
            expect(mockInvoiceService.getInvoiceStatus).not.toHaveBeenCalled();
        });

        test("should handle invoice not found error", async () => {
            const testData = setupTestData();
            Object.assign(req, testData);

            mockInvoiceService.getPartnerId.mockResolvedValue("test-uuid");
            mockInvoiceService.getInvoiceStatus.mockRejectedValue(new NotFoundError("Invoice not found"));

            await controller.getInvoiceStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invoice not found"
            });
        });
    });
});