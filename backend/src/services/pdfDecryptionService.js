const PDFLogger = require('./pdfLoggerAdapter');
const Sentry = require("../instrument");

class PdfDecryptionService {
    constructor(decryptionStrategy) {
        this.decryptionStrategy = decryptionStrategy;
    }

    async decrypt(pdfBuffer, password) {
        const startTime = Date.now();
        const fileSize = pdfBuffer.length;
        const strategyName = this.decryptionStrategy.constructor.name;
        
        try {
            Sentry.addBreadcrumb({
                category: 'pdf-decryption',
                message: `Starting PDF decryption with ${strategyName} strategy`,
                level: 'info'
            });
            
            // Log the start of decryption
            PDFLogger.logDecryptionStart(fileSize, 'decrypt');
            
            // Perform decryption
            const result = await this.decryptionStrategy.decrypt(pdfBuffer, password);
            
            // Log successful decryption
            const processTime = Date.now() - startTime;
            PDFLogger.logDecryptionSuccess(fileSize, processTime, strategyName);
            
            return result;
        } catch (error) {
            // Log decryption failure
            PDFLogger.logDecryptionError(fileSize, error, strategyName);
            
            Sentry.captureException(error);
            
            throw error;
        }
    }
}

module.exports = PdfDecryptionService;