'use strict';

const AzurePurchaseOrderMapper = require('../../../src/services/modelImplementations/azurePurchaseOrderMapper');
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');
const FieldParser = require('../../../src/services/invoiceMapperService/FieldParserService');
const EntityExtractor = require('../../../src/services/invoiceMapperService/entityExtractorService');

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
    })
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

describe('AzurePurchaseOrderMapper', () => {
  let mapper;
  let partnerId;
  
  beforeEach(() => {
    mapper = new AzurePurchaseOrderMapper('azure');
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
    it('should call mapToPurchaseOrderModel with the provided parameters', () => {
      // Spy on the mapToPurchaseOrderModel method
      const spy = jest.spyOn(mapper, 'mapToPurchaseOrderModel').mockReturnValue({});
      
      const ocrResult = { documents: [{ fields: {} }] };
      mapper.mapToModel(ocrResult, partnerId);
      
      expect(spy).toHaveBeenCalledWith(ocrResult, partnerId);
      
      // Restore the original method
      spy.mockRestore();
    });
  });

  describe('mapToPurchaseOrderModel', () => {
    it('should throw error for invalid OCR result format', () => {
      expect(() => mapper.mapToPurchaseOrderModel(null, partnerId))
        .toThrow('Invalid OCR result format');
      
      expect(() => mapper.mapToPurchaseOrderModel({}, partnerId))
        .toThrow('Invalid OCR result format');
      
      expect(() => mapper.mapToPurchaseOrderModel({ documents: [] }, partnerId))
        .toThrow('Invalid OCR result format');
    });
    
    it('should throw error when partnerId is missing', () => {
      const validOcrResult = { documents: [{ fields: {} }] };
      
      expect(() => mapper.mapToPurchaseOrderModel(validOcrResult))
        .toThrow('Partner ID is required');
      
      expect(() => mapper.mapToPurchaseOrderModel(validOcrResult, null))
        .toThrow('Partner ID is required');
      
      expect(() => mapper.mapToPurchaseOrderModel(validOcrResult, ''))
        .toThrow('Partner ID is required');
    });
    
    it('should map Azure OCR result to purchase order model format', () => {
      const ocrResult = {
        documents: [{
          fields: {
            PurchaseOrder: { content: 'PO-2023-001' },
            PONumber: { content: 'PO-2023-001-ALT' }, // Should use PurchaseOrder first
            PODate: { content: '2023-05-15' },
            InvoiceTotal: { content: '$110.00' },
            Total: { content: '$120.00' }, // Should use InvoiceTotal first
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
      
      const result = mapper.mapToPurchaseOrderModel(ocrResult, partnerId);
      
      // Verify the structure of the result
      expect(result).toHaveProperty('purchaseOrderData');
      expect(result).toHaveProperty('customerData');
      expect(result).toHaveProperty('vendorData');
      expect(result).toHaveProperty('itemsData');
      
      // Verify purchase order data mappings
      const { purchaseOrderData } = result;
      expect(purchaseOrderData.po_number).toBeDefined();
      expect(purchaseOrderData.due_date).toBeInstanceOf(Date);
      expect(purchaseOrderData.total_amount).toBe(100); // From mock
      expect(purchaseOrderData.subtotal_amount).toBe(100); // From mock
      expect(purchaseOrderData.discount_amount).toBe(100); // From mock (all fields use same mock)
      expect(purchaseOrderData.tax_amount).toBe(100); // From mock
      expect(purchaseOrderData.status).toBe(DocumentStatus.ANALYZED);
      expect(purchaseOrderData.partner_id).toBe(partnerId);
      expect(purchaseOrderData.currency_symbol).toBe('$');
      expect(purchaseOrderData.currency_code).toBe('USD');
    });
    
    it('should handle missing fields gracefully', () => {
      const minimalOcrResult = {
        documents: [{
          fields: {
            PONumber: { content: 'PO-2023-001' }
          }
        }]
      };
      
      const result = mapper.mapToPurchaseOrderModel(minimalOcrResult, partnerId);
      const { purchaseOrderData } = result;
      
      // With our mocks, all necessary values should be filled from mock defaults
      expect(purchaseOrderData.due_date).toBeInstanceOf(Date);
      
      // Partner ID should still be set
      expect(purchaseOrderData.partner_id).toBe(partnerId);
      
      // Currency fields should be set from the mocks
      expect(purchaseOrderData.currency_symbol).toBe(null);
      expect(purchaseOrderData.currency_code).toBe(null);
    });
    
    it('should handle field fallbacks correctly', () => {
      // Test with alternate field names
      const ocrResultWithAlternateFields = {
        documents: [{
          fields: {
            // Primary fields not present, should use alternates
            PONumber: { content: 'PO-ALT-2023' },
            PODate: { content: '2023-05-10' },
            Total: { content: '$200.00' },
            Discount: { content: '$20.00' },
            Tax: { content: '$30.00' }
          }
        }]
      };
      
      const result = mapper.mapToPurchaseOrderModel(ocrResultWithAlternateFields, partnerId);
      const { purchaseOrderData } = result;
      
      // Should have correctly used the alternate field names
      expect(purchaseOrderData.po_number).toBe('PO-ALT-2023');
    });
  });
});

// Mock the dependencies to verify they are instantiated
jest.mock('../../../src/services/invoiceMapperService/FieldParserService');
jest.mock('../../../src/services/invoiceMapperService/entityExtractorService');

describe('AzurePurchaseOrderMapper', () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and methods
    jest.clearAllMocks();
    
    // Set up the mock implementations
    FieldParser.mockImplementation(() => ({
      getFieldContent: jest.fn(),
      parseDate: jest.fn(),
      parseCurrency: jest.fn()
    }));
    
    EntityExtractor.mockImplementation(() => ({
      extractLineItems: jest.fn(),
      extractCustomerData: jest.fn(),
      extractVendorData: jest.fn()
    }));
  });
  
  describe('constructor', () => {
    it('should initialize with default model type and create dependencies', () => {
      // This test specifically targets line 16 which creates the EntityExtractor
      const mapper = new AzurePurchaseOrderMapper();
      
      // Verify constructor calls
      expect(FieldParser).toHaveBeenCalled();
      expect(EntityExtractor).toHaveBeenCalled();
      
      // Verify model type
      expect(mapper.modelType).toBe('azure');
      
      // Verify dependencies are created
      expect(mapper.fieldParser).toBeDefined();
      expect(mapper.EntityExtractor).toBeDefined();
    });
    
    it('should initialize with custom model type', () => {
      const mapper = new AzurePurchaseOrderMapper('custom-azure');
      
      // Verify model type is set but still creates Azure-specific dependencies
      expect(mapper.modelType).toBe('custom-azure');
      expect(FieldParser).toHaveBeenCalled();
      expect(EntityExtractor).toHaveBeenCalled();
    });
  });
  
  // Minimal test for the mapToModel method to ensure complete coverage
  describe('mapToModel', () => {
    it('should call mapToPurchaseOrderModel with the same parameters', () => {
      const mapper = new AzurePurchaseOrderMapper();
      
      // Spy on the mapToPurchaseOrderModel method
      const spy = jest.spyOn(mapper, 'mapToPurchaseOrderModel').mockReturnValue({});
      
      const ocrResult = {};
      const partnerId = 'test-partner';
      
      mapper.mapToModel(ocrResult, partnerId);
      
      expect(spy).toHaveBeenCalledWith(ocrResult, partnerId);
      
      // Restore the original method
      spy.mockRestore();
    });
  });
});