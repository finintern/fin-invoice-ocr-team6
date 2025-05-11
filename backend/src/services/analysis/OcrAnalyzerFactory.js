const AzureDocumentAnalyzer = require('./azureDocumentAnalyzer');

/**
 * Factory class for creating OCR analyzer instances
 */
class OcrAnalyzerFactory {
  /**
   * List of registered OCR analyzer types
   * @private
   */
  static #analyzerTypes = {
    azure: AzureDocumentAnalyzer
  };

  /**
   * Create an OCR analyzer instance of the specified type
   * @param {string} type - The type of OCR analyzer to create ('azure', etc.)
   * @param {Object} config - Configuration options for the analyzer
   * @returns {OcrAnalyzer} An instance of the specified OCR analyzer
   * @throws {Error} If the analyzer type is not supported
   */
  static createAnalyzer(type = 'azure', config = {}) {
    const AnalyzerClass = this.#analyzerTypes[type.toLowerCase()];
    
    if (!AnalyzerClass) {
      throw new Error(`Unsupported OCR analyzer type: ${type}`);
    }
    
    return new AnalyzerClass(config);
  }

  /**
   * Register a new OCR analyzer type
   * @param {string} type - Unique identifier for the analyzer type
   * @param {Class} analyzerClass - The analyzer class to register
   */
  static registerAnalyzerType(type, analyzerClass) {
    if (typeof type !== 'string' || !type) {
      throw new Error('Analyzer type must be a non-empty string');
    }
    
    if (typeof analyzerClass !== 'function') {
      throw new Error('Analyzer class must be a constructor function');
    }
    
    this.#analyzerTypes[type.toLowerCase()] = analyzerClass;
  }

  /**
   * Get all registered analyzer types
   * @returns {string[]} Array of registered analyzer type names
   */
  static getRegisteredTypes() {
    return Object.keys(this.#analyzerTypes);
  }
}

module.exports = OcrAnalyzerFactory;