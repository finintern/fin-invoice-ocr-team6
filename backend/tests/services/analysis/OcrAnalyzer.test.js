const OcrAnalyzer = require('../../../src/services/analysis/OcrAnalyzer');

describe('OcrAnalyzer', () => {
  let analyzer;
  
  beforeEach(() => {
    analyzer = new OcrAnalyzer();
  });
  
  test('should throw error when analyzeDocument is not implemented', async () => {
    await expect(analyzer.analyzeDocument('some-document')).rejects.toThrow(
      'analyzeDocument method must be implemented by subclass'
    );
  });
  
  test('should throw error when getType is not implemented', () => {
    expect(() => {
      analyzer.getType();
    }).toThrow('getType method must be implemented by subclass');
  });
});