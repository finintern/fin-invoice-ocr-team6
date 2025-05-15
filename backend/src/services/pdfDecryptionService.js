const Sentry = require("../instrument");

class pdfDecryptionService {
    constructor(decryptionStrategy) {
        this.decryptionStrategy = decryptionStrategy;
    }

    async decrypt(pdfBuffer, password) {
        return Sentry.startSpan(
            {
                name: "pdf.decrypt",
                attributes: {
                    hasPassword: !!password,
                    bufferSize: pdfBuffer ? pdfBuffer.length : 0
                },
            },
            async (span) => {
                try {
                    Sentry.addBreadcrumb({
                        category: "pdf",
                        message: "Starting PDF decryption",
                        level: "info",
                    });
                    
                    const result = await this.decryptionStrategy.decrypt(pdfBuffer, password);
                    
                    Sentry.addBreadcrumb({
                        category: "pdf",
                        message: "PDF decryption completed successfully",
                        level: "info",
                    });
                    
                    return result;
                } catch (error) {
                    Sentry.addBreadcrumb({
                        category: "pdf",
                        message: `PDF decryption error: ${error.message}`,
                        level: "error",
                    });
                    
                    Sentry.captureException(error);
                    throw error;
                } finally {
                    span.end();
                }
            }
        );
    }
}

module.exports = pdfDecryptionService;