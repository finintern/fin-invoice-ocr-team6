'use strict';

const AzureInvoiceMapper = require('../../../src/services/modelImplementations/azureInvoiceMapper');
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');

// Mock dependencies
jest.mock('../../../src/services/invoiceMapperService/FieldParserService', () => {
  return jest.fn().mockImplementation(() => ({
    getFieldContent: jest.fn(field => field ? field.content : null),
    parseDate: jest.fn().mockImplementation((field) => field ? new Date('2023-05-15') : new Date()),
    parseCurrency: jest.fn().mockImplementation((field) => {
      if (!field) return { amount: null, currency: { currencySymbol: null, currencyCode: null } };
      const amount = field.amount || 100;
      return { 
        amount: amount, 
        currency: { 
          currencySymbol: field.currencySymbol || '$', 
          currencyCode: field.currencyCode || 'USD' 
        } 
      };
    }),
    calculateDueDate: jest.fn().mockReturnValue(new Date('2023-06-15'))
  }));
});

jest.mock('../../../src/services/invoiceMapperService/entityExtractorService', () => {
  return jest.fn().mockImplementation(() => ({
    extractCustomerData: jest.fn().mockReturnValue({ name: 'Test Customer', address: '123 Main St' }),
    extractVendorData: jest.fn().mockReturnValue({ name: 'Test Vendor', address: '456 Vendor St' }),
    extractLineItems: jest.fn().mockReturnValue([
      { description: 'Item 1', quantity: 2, unitPrice: 50, amount: 100 }
    ])
  }));
});

describe('AzureInvoiceMapper', () => {
  let mapper;
  let partnerId;
  
  beforeEach(() => {
    mapper = new AzureInvoiceMapper('azure');
    partnerId = 'test-partner-id';
  });

  describe('constructor', () => {
    it('should initialize with proper model type and dependencies', () => {
      expect(mapper.getModelType()).toBe('azure');
      expect(mapper.fieldParser).toBeDefined();
      expect(mapper.EntityExtractor).toBeDefined();
    });
  });

  describe('mapToModel', () => {
    it('should call mapToInvoiceModel with the provided parameters', () => {
      // Spy on the mapToInvoiceModel method
      const spy = jest.spyOn(mapper, 'mapToInvoiceModel').mockReturnValue({});
      
      const ocrResult = { documents: [{ fields: {} }] };
      mapper.mapToModel(ocrResult, partnerId);
      
      expect(spy).toHaveBeenCalledWith(ocrResult, partnerId);
      
      // Restore the original method
      spy.mockRestore();
    });
  });

  describe('mapToInvoiceModel', () => {
    it('should throw error for invalid OCR result format', () => {
      expect(() => mapper.mapToInvoiceModel(null, partnerId))
        .toThrow('Invalid OCR result format');
      
      expect(() => mapper.mapToInvoiceModel({}, partnerId))
        .toThrow('Invalid OCR result format');
      
      expect(() => mapper.mapToInvoiceModel({ documents: [] }, partnerId))
        .toThrow('Invalid OCR result format');
    });
    
    it('should throw error when partnerId is missing', () => {
      const validOcrResult = { documents: [{ fields: {} }] };
      
      expect(() => mapper.mapToInvoiceModel(validOcrResult))
        .toThrow('Partner ID is required');
      
      expect(() => mapper.mapToInvoiceModel(validOcrResult, null))
        .toThrow('Partner ID is required');
      
      expect(() => mapper.mapToInvoiceModel(validOcrResult, ''))
        .toThrow('Partner ID is required');
    });
    
    it('should map Azure OCR result to invoice model format', () => {
      const ocrResult = {
        documents: [{
          fields: {
            InvoiceId: { content: 'INV-2023-001' },
            InvoiceDate: { content: '2023-05-15' },
            DueDate: { content: '2023-06-15' },
            PurchaseOrder: { content: '12345' },
            InvoiceTotal: { content: '$110.00' },
            SubTotal: { content: '$100.00' },
            TotalDiscount: { content: '$5.00' },
            TotalTax: { content: '$15.00' },
            PaymentTerm: { content: 'Net 30' },
            Items: {
              values: [
                { 
                  properties: {
                    Description: { content: 'Item 1' },
                    Quantity: { content: '2' },
                    UnitPrice: { content: '$50.00' },
                    Amount: { content: '$100.00' }
                  }
                }
              ]
            }
          }
        }]
      };
      
      const result = mapper.mapToInvoiceModel(ocrResult, partnerId);
      
      // Verify the structure of the result
      expect(result).toHaveProperty('invoiceData');
      expect(result).toHaveProperty('customerData');
      expect(result).toHaveProperty('vendorData');
      expect(result).toHaveProperty('itemsData');
      
      // Verify invoice data mappings
      const { invoiceData } = result;
      expect(invoiceData.invoice_number).toBeDefined();
      expect(invoiceData.invoice_date).toBeInstanceOf(Date);
      expect(invoiceData.due_date).toBeInstanceOf(Date);
      expect(invoiceData.total_amount).toBe(100); // From mock
      expect(invoiceData.subtotal_amount).toBe(100); // From mock
      expect(invoiceData.discount_amount).toBe(100); // From mock (all fields use same mock)
      expect(invoiceData.tax_amount).toBe(100); // From mock
      expect(invoiceData.status).toBe(DocumentStatus.ANALYZED);
      expect(invoiceData.partner_id).toBe(partnerId);
      expect(invoiceData.currency_symbol).toBe('$');
      expect(invoiceData.currency_code).toBe('USD');
    });
    
    it('should handle missing fields gracefully', () => {
      const minimalOcrResult = {
        documents: [{
          fields: {
            InvoiceId: { content: 'INV-2023-001' }
          }
        }]
      };
      
      const result = mapper.mapToInvoiceModel(minimalOcrResult, partnerId);
      const { invoiceData } = result;
      
      // With our mocks, all date fields should default to values from the mocks
      expect(invoiceData.invoice_date).toBeInstanceOf(Date);
      
      // Partner ID should still be set
      expect(invoiceData.partner_id).toBe(partnerId);
      
      // Currency fields should be set from the mocks
      expect(invoiceData.currency_symbol).toBe(null);
      expect(invoiceData.currency_code).toBe(null);
    });
  });
});