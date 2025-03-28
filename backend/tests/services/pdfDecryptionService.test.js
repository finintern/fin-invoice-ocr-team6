const fs = require('fs');
const path = require('path');
const PdfDecryptionService = require('../../src/services/pdfDecryptionService');
const QpdfDecryption = require('../../src/strategies/qpdfDecryption'); // Pastikan ini ada
const { Buffer } = require('buffer');

describe('pdfDecryptionService', () => {
    let decryptionService;
    let encryptedPdfBuffer;
    let correctPassword;
    let wrongPassword;

    beforeAll(() => {
        decryptionService = new PdfDecryptionService(new QpdfDecryption());

        // Load PDF terenkripsi sebagai buffer
        const encryptedPdfPath = path.join(__dirname, '../strategies/test-files/encrypted.pdf');
        if (!fs.existsSync(encryptedPdfPath)) {
            throw new Error(`Test file not found: ${encryptedPdfPath}`);
        }
        encryptedPdfBuffer = fs.readFileSync(encryptedPdfPath);

        correctPassword = 'correct-password';
        wrongPassword = 'wrong_password';
    });

    // ✅ POSITIVE TEST CASES
    test('should successfully decrypt an encrypted PDF with the correct password', async () => {
        const decryptedBuffer = await decryptionService.decrypt(encryptedPdfBuffer, correctPassword);

        expect(decryptedBuffer).toBeInstanceOf(Buffer);
        expect(decryptedBuffer.length).toBeGreaterThan(0);
    }, 15000); // Timeout lebih lama untuk proses dekripsi

    test('should fail to decrypt with an incorrect password', async () => {
        await expect(decryptionService.decrypt(encryptedPdfBuffer, wrongPassword))
            .rejects.toThrow('Failed to decrypt PDF: Incorrect password.');
    }, 15000);

    test('should fail when given an empty buffer', async () => {
        await expect(decryptionService.decrypt(Buffer.alloc(0), correctPassword))
            .rejects.toThrow('Failed to decrypt PDF: Corrupted file.');
    });

    test('should fail when input is not a buffer', async () => {
        await expect(decryptionService.decrypt('not-a-buffer', correctPassword))
            .rejects.toThrow('Invalid input: Expected a Buffer.');
    });
});
