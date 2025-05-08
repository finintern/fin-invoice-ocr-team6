/**
 * Abstract base class for OCR analyzers
 * This class defines the interface that all OCR analyzer implementations must follow
 */
class OcrAnalyzer {
  /**
   * Analyze a document and extract structured data
   * @param {Buffer|string} documentSource - Document content as buffer or URL string
   * @returns {Promise<Object>} - Structured data extracted from the document
   * @throws {Error} - If analysis fails
   */
  async analyzeDocument(_documentSource) {
    throw new Error('analyzeDocument method must be implemented by subclass');
  }

  /**
   * Get the type of OCR analyzer
   * @returns {string} - The analyzer type identifier
   */
  getType() {
    throw new Error('getType method must be implemented by subclass');
  }
}

module.exports = OcrAnalyzer;