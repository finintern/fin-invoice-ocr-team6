const OcrAnalyzerFactory = require('../../../src/services/analysis/OcrAnalyzerFactory');
const OcrAnalyzer = require('../../../src/services/analysis/OcrAnalyzer');
const AzureDocumentAnalyzer = require('../../../src/services/analysis/azureDocumentAnalyzer');

describe('OcrAnalyzerFactory', () => {
  // Test createAnalyzer with default parameters
  test('should create an AzureDocumentAnalyzer instance by default', () => {
    const analyzer = OcrAnalyzerFactory.createAnalyzer();
    expect(analyzer).toBeInstanceOf(AzureDocumentAnalyzer);
  });
  
  // Test createAnalyzer with specified type
  test('should create the requested analyzer type', () => {
    // First, create a mock analyzer class
    class TestAnalyzer extends OcrAnalyzer {}
    
    // Register the new analyzer type
    OcrAnalyzerFactory.registerAnalyzerType('test', TestAnalyzer);
    
    // Create an instance of the new analyzer type
    const analyzer = OcrAnalyzerFactory.createAnalyzer('test');
    expect(analyzer).toBeInstanceOf(TestAnalyzer);
  });
  
  // Test error case for unsupported analyzer type
  test('should throw an error for unsupported analyzer type', () => {
    expect(() => {
      OcrAnalyzerFactory.createAnalyzer('unsupported');
    }).toThrow('Unsupported OCR analyzer type: unsupported');
  });
  
  // Test error cases for registerAnalyzerType
  test('should throw an error when registering with invalid type', () => {
    expect(() => {
      OcrAnalyzerFactory.registerAnalyzerType('', class Test {});
    }).toThrow('Analyzer type must be a non-empty string');
    
    expect(() => {
      OcrAnalyzerFactory.registerAnalyzerType(123, class Test {});
    }).toThrow('Analyzer type must be a non-empty string');
  });
  
  test('should throw an error when registering with invalid class', () => {
    expect(() => {
      OcrAnalyzerFactory.registerAnalyzerType('test', {});
    }).toThrow('Analyzer class must be a constructor function');
  });
  
  // Test getRegisteredTypes
  test('should return array of registered analyzer types', () => {
    // Clear existing types (if possible) or ensure we add a unique one for testing
    class TestAnalyzer extends OcrAnalyzer {}
    OcrAnalyzerFactory.registerAnalyzerType('uniqueType', TestAnalyzer);
    
    const types = OcrAnalyzerFactory.getRegisteredTypes();
    expect(types).toContain('uniquetype'); // lowercase due to implementation
    expect(Array.isArray(types)).toBe(true);
  });
});