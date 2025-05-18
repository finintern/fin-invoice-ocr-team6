const OcrAnalyzer = require('./OcrAnalyzer');
const Sentry = require("../../instrument");

/**
 * Dummy OCR analyzer for demonstration purposes
 * This analyzer provides a simplified implementation that focuses on extracting
 * basic invoice fields using predefined patterns
 */
class DummyOcrAnalyzer extends OcrAnalyzer {
  constructor(config = {}) {
    super();
    this.confidence = config.confidence || 0.85;
    this.processingDelayMs = config.processingDelayMs || 1000;
    this.shouldSimulateError = config.shouldSimulateError || false;
  }

  getType() {
    return 'dummy';
  }

  /**
   * Simulates document analysis with basic pattern recognition
   * @param {Buffer|string} documentSource - Document content as buffer or URL string
   * @returns {Promise<Object>} - Structured data extracted from the document
   */
  async analyzeDocument(documentSource) {
    if (!documentSource) {
      throw new Error("documentSource is required");
    }

    return Sentry.startSpan(
      {
        name: "analyzeDocumentWithDummyModel",
        attributes: {
          documentSource: "string",
          analyzerType: "dummy"
        },
      },
      async (span) => {
        try {
          Sentry.addBreadcrumb({
            category: "documentAnalysis",
            message: `Starting dummy analysis`,
            level: "info",
          });

          console.log("Processing document with dummy analyzer...");
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, this.processingDelayMs));
          
          // Simulate error if configured to do so
          if (this.shouldSimulateError) {
            throw new Error("Dummy analyzer simulated error");
          }

          // Generate dummy result (similar structure to Azure Form Recognizer)
          const dummyResult = this.generateDummyResult();

          Sentry.addBreadcrumb({
            category: "documentAnalysis",
            message: "Dummy analysis completed successfully",
            level: "info",
          });

          return {
            message: "Document processed with dummy analyzer",
            data: dummyResult
          };
        } catch (error) {
          Sentry.addBreadcrumb({
            category: "documentAnalysis",
            message: `Error encountered in dummy analyzer: ${error.message}`,
            level: "error",
          });

          Sentry.captureException(error);
          throw new Error(`Dummy analyzer failed: ${error.message}`);
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Generate a dummy result that mimics Azure Form Recognizer structure
   * @private
   * @returns {Object} - Structured data in Azure-like format
   */
  generateDummyResult() {
    const currentDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(currentDate.getDate() + 30);
    
    const invoiceId = `INV-${Math.floor(10000 + Math.random() * 90000)}`;
    const total = Math.floor(100 + Math.random() * 9000) / 100;
    const subtotal = Math.round(total * 0.85 * 100) / 100;
    const tax = Math.round((total - subtotal) * 100) / 100;
    
    return {
      documents: [{
        docType: "prebuilt:invoice",
        fields: {
          InvoiceId: { 
            content: invoiceId,
            confidence: this.confidence
          },
          InvoiceDate: { 
            content: currentDate.toISOString().split('T')[0],
            confidence: this.confidence
          },
          DueDate: { 
            content: dueDate.toISOString().split('T')[0],
            confidence: this.confidence
          },
          VendorName: { 
            content: "Dummy Corp Ltd",
            confidence: this.confidence
          },
          VendorAddress: { 
            content: "123 Dummy Street, Dummyville, DM 12345",
            confidence: this.confidence * 0.9
          },
          CustomerName: { 
            content: "Sample Customer Inc",
            confidence: this.confidence
          },
          CustomerAddress: {
            content: "456 Example Ave, Sampletown, SP 67890",
            confidence: this.confidence * 0.9
          },
          CustomerAddressRecipient: {
            content: "John Doe",
            confidence: this.confidence * 0.8
          },
          InvoiceTotal: { 
            valueType: "numberValue",
            content: total.toString(),
            value: {
              amount: total,
              currency: "USD"
            },
            confidence: this.confidence
          },
          SubTotal: {
            valueType: "numberValue",
            content: subtotal.toString(),
            value: {
              amount: subtotal,
              currency: "USD"
            },
            confidence: this.confidence
          },
          TotalTax: {
            valueType: "numberValue",
            content: tax.toString(),
            value: {
              amount: tax,
              currency: "USD"
            },
            confidence: this.confidence * 0.9
          },
          Items: {
            valueType: "array",
            value: [
              {
                valueType: "object",
                fields: {
                  Description: { content: "Dummy Product A", confidence: this.confidence },
                  Quantity: { content: "2", confidence: this.confidence },
                  UnitPrice: { 
                    content: (subtotal * 0.4).toString(),
                    valueType: "numberValue",
                    value: { amount: subtotal * 0.4, currency: "USD" },
                    confidence: this.confidence
                  },
                  Amount: { 
                    content: (subtotal * 0.8).toString(),
                    valueType: "numberValue",
                    value: { amount: subtotal * 0.8, currency: "USD" },
                    confidence: this.confidence
                  }
                }
              },
              {
                valueType: "object",
                fields: {
                  Description: { content: "Dummy Service B", confidence: this.confidence },
                  Quantity: { content: "1", confidence: this.confidence },
                  UnitPrice: { 
                    content: (subtotal * 0.2).toString(),
                    valueType: "numberValue",
                    value: { amount: subtotal * 0.2, currency: "USD" },
                    confidence: this.confidence
                  },
                  Amount: { 
                    content: (subtotal * 0.2).toString(),
                    valueType: "numberValue",
                    value: { amount: subtotal * 0.2, currency: "USD" },
                    confidence: this.confidence
                  }
                }
              }
            ]
          }
        }
      }]
    };
  }
}

module.exports = DummyOcrAnalyzer;