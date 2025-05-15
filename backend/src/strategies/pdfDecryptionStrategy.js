class PdfDecryptionStrategy {
    // eslint-disable-next-line no-unused-vars
    async decrypt(pdfBuffer, password) {
        throw new Error('decrypt method must be implemented');
    }
}

module.exports = PdfDecryptionStrategy;