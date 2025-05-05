'use strict';

const { DocumentMapper, InvoiceMapper, PurchaseOrderMapper } = require('../../../src/services/mapperService/baseMapper');

describe('BaseMapper', () => {
  // DocumentMapper tests
  describe('DocumentMapper', () => {
    describe('constructor', () => {
      it('should initialize with default modelType', () => {
        const mapper = new DocumentMapper();
        expect(mapper.modelType).toBe('azure');
      });

      it('should initialize with specified modelType', () => {
        const mapper = new DocumentMapper('google');
        expect(mapper.modelType).toBe('google');
      });
    });

    describe('getModelType', () => {
      it('should return the current modelType', () => {
        const mapper = new DocumentMapper('custom');
        expect(mapper.getModelType()).toBe('custom');
      });
    });

    describe('setModelType', () => {
      it('should update the modelType', () => {
        const mapper = new DocumentMapper('azure');
        mapper.setModelType('google');
        expect(mapper.modelType).toBe('google');
      });
    });

    describe('mapToModel', () => {
      it('should throw "Method not implemented" error', () => {
        const mapper = new DocumentMapper();
        expect(() => mapper.mapToModel({}, 'partner-123')).toThrow('Method not implemented');
      });
    });

    describe('generatePartnerId', () => {
      it('should generate a valid partnerId from vendor name', () => {
        const mapper = new DocumentMapper();
        expect(mapper.generatePartnerId('Test Vendor Name')).toBe('test-vendor-name');
      });

      it('should handle special characters in vendor name', () => {
        const mapper = new DocumentMapper();
        expect(mapper.generatePartnerId('Special Char$%^ Inc.')).toBe('special-char-inc');
      });

      it('should truncate long vendor names to 44 characters', () => {
        const mapper = new DocumentMapper();
        const longName = 'Very Long Vendor Name That Exceeds The Maximum Length Allowed';
        const result = mapper.generatePartnerId(longName);
        expect(result.length).toBeLessThanOrEqual(44);
        expect(result).toBe('very-long-vendor-name-that-exceeds-the-maxim');
      });

      it('should return "unknown-vendor" when no vendor name is provided', () => {
        const mapper = new DocumentMapper();
        expect(mapper.generatePartnerId('')).toBe('unknown-vendor');
        expect(mapper.generatePartnerId(null)).toBe('unknown-vendor');
        expect(mapper.generatePartnerId(undefined)).toBe('unknown-vendor');
      });
    });
  });

  // InvoiceMapper tests
  describe('InvoiceMapper', () => {
    describe('constructor', () => {
      it('should initialize with default modelType', () => {
        const mapper = new InvoiceMapper();
        expect(mapper.modelType).toBe('azure');
      });

      it('should initialize with specified modelType', () => {
        const mapper = new InvoiceMapper('google');
        expect(mapper.modelType).toBe('google');
      });
    });

    describe('mapToInvoiceModel', () => {
      it('should throw "Method not implemented" error', () => {
        const mapper = new InvoiceMapper();
        expect(() => mapper.mapToInvoiceModel({}, 'partner-123')).toThrow('Method not implemented');
      });
    });
  });

  // PurchaseOrderMapper tests
  describe('PurchaseOrderMapper', () => {
    describe('constructor', () => {
      it('should initialize with default modelType', () => {
        const mapper = new PurchaseOrderMapper();
        expect(mapper.modelType).toBe('azure');
      });

      it('should initialize with specified modelType', () => {
        const mapper = new PurchaseOrderMapper('google');
        expect(mapper.modelType).toBe('google');
      });
    });

    describe('mapToPurchaseOrderModel', () => {
      it('should throw "Method not implemented" error', () => {
        const mapper = new PurchaseOrderMapper();
        expect(() => mapper.mapToPurchaseOrderModel({}, 'partner-123')).toThrow('Method not implemented');
      });
    });
  });
});