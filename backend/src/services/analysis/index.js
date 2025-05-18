const OcrAnalyzer = require('./OcrAnalyzer');
const OcrAnalyzerFactory = require('./OcrAnalyzerFactory');
const AzureDocumentAnalyzer = require('./azureDocumentAnalyzer');
const DummyOcrAnalyzer = require('./DummyOcrAnalyzer');

// Register all available analyzers with the factory
OcrAnalyzerFactory.registerAnalyzerType('dummy', DummyOcrAnalyzer);

// Export all components
module.exports = {
  OcrAnalyzer,
  OcrAnalyzerFactory,
  AzureDocumentAnalyzer,
  DummyOcrAnalyzer
};