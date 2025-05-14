class PdfDecryptionService {
    constructor(decryptionStrategy) {
        this.decryptionStrategy = decryptionStrategy;
    }

    async decrypt(pdfBuffer, password) {
        return this.decryptionStrategy.decrypt(pdfBuffer, password);
    }
}

module.exports = PdfDecryptionService;