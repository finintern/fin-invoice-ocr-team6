const path = require("path");
const pdfCounter = require("pdf-page-counter");
const { PayloadTooLargeError, UnsupportedMediaTypeError, ValidationError } = require("../utils/errors");

class PdfValidationService {
    /**
     * Validates if a file is a valid PDF
     * This function checks three criteria to determine if a file is a valid PDF:
     * 1. The MIME type must be "application/pdf"
     * 2. The file extension must be ".pdf"
     * 3. The file content must begin with the PDF signature "%PDF-"
     * 
     * @param {Buffer} fileBuffer - The file content as a buffer
     * @param {string} mimeType - The MIME type of the file
     * @param {string} fileName - The original filename with extension
     * @returns {Promise<boolean>} Returns true if validation passes, throws an error otherwise
     * @throws {Error} Throws an error with a specific message if validation fails
     */
    async validatePDF(fileBuffer, mimeType, fileName) {
        if (mimeType !== "application/pdf") {
            throw new Error("Invalid MIME type");
        }

        const validExtensions = [".pdf"];
        const fileExtension = path.extname(fileName).toLowerCase();
        if (!validExtensions.includes(fileExtension)) {
            throw new Error("Invalid file extension");
        }

        const pdfSignature = "%PDF-";
        const fileHeader = fileBuffer.subarray(0, 5).toString();
        if (fileHeader !== pdfSignature) {
            throw new Error("Invalid PDF file");
        }

        return true;
    }

    /**
     * Validates the size of a file
     * @param {Buffer} fileBuffer - The file buffer to validate
     * @returns {Promise<boolean>} - Returns true if validation passes
     * @throws {Error} - Throws an error if validation fails
     */
    async validateSizeFile(fileBuffer) {
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        
        if (fileBuffer.length > MAX_FILE_SIZE) {
            throw new PayloadTooLargeError(`File exceeds maximum allowed size of 20MB`);
        }

        return true;
    }

    /**
     * Checks if a PDF file is encrypted.
     * 
     * This function analyzes a PDF buffer to determine if it's encrypted
     * by searching for the '/Encrypt' entry in the PDF trailer section.
     * 
     * @param {Buffer} pdfBuffer - Buffer containing the PDF file data to check
     * @returns {boolean} - Returns true if the PDF is encrypted, false otherwise
     */
    async isPdfEncrypted(pdfBuffer) {
        const bufferSize = pdfBuffer.length;
        const searchSize = Math.min(bufferSize, 8192); 
        
        const pdfTrailer = pdfBuffer.subarray(bufferSize - searchSize).toString('utf-8');
        return pdfTrailer.includes('/Encrypt');
    }    
    
    /**
     * Validates the number of pages in a PDF file.
     * 
     * This function ensures that the PDF has at least 1 page 
     * and does not exceed 100 pages.
     * 
     * @param {Buffer} fileBuffer - Buffer containing the PDF file data
     * @returns {Promise<boolean>} - Returns true if the PDF has a valid page count
     * @throws {Error} - Throws an error if the PDF is empty or exceeds the limit
     */
    async validatePdfPageCount(fileBuffer) {
        try {
            const data = await pdfCounter(fileBuffer);
            const pageCount = data.numpages;

            if (pageCount === 0) {
                throw new Error("PDF has no pages.");
            }

            if (pageCount > 100) {
                throw new Error("PDF exceeds the maximum allowed pages (100).");
            }

            return true;
        } catch (error) {
            if (error.message === "PDF has no pages." || error.message === "PDF exceeds the maximum allowed pages (100).") {
                throw error;
            }
            throw new Error("Failed to read PDF page count.");
        }
    }  

    async allValidations(fileBuffer, mimeType, fileName) {
        try {
            await this.validatePDF(fileBuffer, mimeType, fileName);
        } catch (error) {
            throw new UnsupportedMediaTypeError(error.message);
        }

        try {
            await this.validateSizeFile(fileBuffer);
        } catch (error) {
            throw new PayloadTooLargeError(error.message);
        }

        const isEncrypted = await this.isPdfEncrypted(fileBuffer);
        if (isEncrypted) {
            // Return encrypted status instead of throwing an error
            return { isValid: true, isEncrypted: true };
        }
        
        try {
            await this.validatePdfPageCount(fileBuffer);
        } catch (error) {
            throw new ValidationError(error.message);
        } 
        
        // PDF is valid and not encrypted
        return { isValid: true, isEncrypted: false };
    }
}

module.exports = new PdfValidationService();
