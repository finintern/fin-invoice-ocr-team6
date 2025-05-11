const DummyOcrAnalyzer = require('../../../src/services/analysis/DummyOcrAnalyzer');
const Sentry = require("../../../src/instrument");

// Mock Sentry
jest.mock('../../../src/instrument', () => ({
  startSpan: jest.fn((_, callback) => callback({
    end: jest.fn()
  })),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn()
}));

describe('DummyOcrAnalyzer', () => {
  let analyzer;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should create instance with default configuration', () => {
    analyzer = new DummyOcrAnalyzer();
    expect(analyzer).toBeDefined();
    expect(analyzer.confidence).toBe(0.85);
    expect(analyzer.processingDelayMs).toBe(1000);
    expect(analyzer.shouldSimulateError).toBe(false);
  });
  
  test('should create instance with custom configuration', () => {
    const config = {
      confidence: 0.95,
      processingDelayMs: 500,
      shouldSimulateError: true
    };
    
    analyzer = new DummyOcrAnalyzer(config);
    expect(analyzer.confidence).toBe(0.95);
    expect(analyzer.processingDelayMs).toBe(500);
    expect(analyzer.shouldSimulateError).toBe(true);
  });
  
  test('should return correct type', () => {
    analyzer = new DummyOcrAnalyzer();
    expect(analyzer.getType()).toBe('dummy');
  });
  
  test('should throw error when documentSource is missing', async () => {
    analyzer = new DummyOcrAnalyzer();
    await expect(analyzer.analyzeDocument()).rejects.toThrow('documentSource is required');
  });
  
  test('should analyze document and return dummy result', async () => {
    analyzer = new DummyOcrAnalyzer({ processingDelayMs: 10 }); // use short delay for testing
    
    jest.useFakeTimers();
    const promise = analyzer.analyzeDocument('test-document');
    
    // Fast-forward time
    jest.advanceTimersByTime(10);
    
    const result = await promise;
    expect(result).toHaveProperty('message', 'Document processed with dummy analyzer');
    expect(result).toHaveProperty('data');
    expect(result.data).toHaveProperty('documents');
    
    // Verify Sentry was called
    expect(Sentry.startSpan).toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Dummy analysis completed successfully')
      })
    );
    
    jest.useRealTimers();
  });
  
  test('should throw error when shouldSimulateError is true', async () => {
    analyzer = new DummyOcrAnalyzer({ 
      shouldSimulateError: true,
      processingDelayMs: 10
    });
    
    jest.useFakeTimers();
    const promise = analyzer.analyzeDocument('test-document');
    
    // Fast-forward time
    jest.advanceTimersByTime(10);
    
    await expect(promise).rejects.toThrow('Dummy analyzer failed: Dummy analyzer simulated error');
    
    // Verify error was captured with Sentry
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error'
      })
    );
    
    jest.useRealTimers();
  });
  
  test('should generate dummy result with expected structure', async () => {
    analyzer = new DummyOcrAnalyzer({ processingDelayMs: 10 });
    
    jest.useFakeTimers();
    const promise = analyzer.analyzeDocument('test-document');
    
    // Fast-forward time
    jest.advanceTimersByTime(10);
    
    const result = await promise;
    
    // Check main fields are present
    const document = result.data.documents[0];
    expect(document).toHaveProperty('docType', 'prebuilt:invoice');
    expect(document).toHaveProperty('fields');
    
    // Check critical fields are present with expected format
    const fields = document.fields;
    expect(fields).toHaveProperty('InvoiceId');
    expect(fields).toHaveProperty('InvoiceDate');
    expect(fields).toHaveProperty('DueDate');
    expect(fields).toHaveProperty('VendorName');
    expect(fields).toHaveProperty('InvoiceTotal');
    expect(fields).toHaveProperty('Items');
    
    // Check that confidence value is properly set
    expect(fields.InvoiceId.confidence).toBe(analyzer.confidence);
    
    jest.useRealTimers();
  });
});