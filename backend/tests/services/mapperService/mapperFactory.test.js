'use strict';

const MapperFactory = require('../../../src/services/mapperService/mapperFactory');
const AzureInvoiceMapper = require('../../../src/services/modelImplementations/azureInvoiceMapper');
const AzurePurchaseOrderMapper = require('../../../src/services/modelImplementations/azurePurchaseOrderMapper');

// Mock console.warn to avoid cluttering the test output
console.warn = jest.fn();

describe('MapperFactory', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoiceMapper', () => {
    it('should create an AzureInvoiceMapper instance by default', () => {
      const mapper = MapperFactory.createInvoiceMapper();
      expect(mapper).toBeInstanceOf(AzureInvoiceMapper);
      expect(mapper.getModelType()).toBe('azure');
    });

    it('should create an AzureInvoiceMapper when "azure" type is specified', () => {
      const mapper = MapperFactory.createInvoiceMapper('azure');
      expect(mapper).toBeInstanceOf(AzureInvoiceMapper);
      expect(mapper.getModelType()).toBe('azure');
    });

    it('should fall back to AzureInvoiceMapper when an invalid model type is specified', () => {
      const mapper = MapperFactory.createInvoiceMapper('invalid-model');
      expect(mapper).toBeInstanceOf(AzureInvoiceMapper);
      expect(mapper.getModelType()).toBe('azure');
      expect(console.warn).toHaveBeenCalledWith(
        'Mapper implementation for model type "invalid-model" not found. Using default Azure implementation.'
      );
    });
  });

  describe('createPurchaseOrderMapper', () => {
    it('should create an AzurePurchaseOrderMapper instance by default', () => {
      const mapper = MapperFactory.createPurchaseOrderMapper();
      expect(mapper).toBeInstanceOf(AzurePurchaseOrderMapper);
      expect(mapper.getModelType()).toBe('azure');
    });

    it('should create an AzurePurchaseOrderMapper when "azure" type is specified', () => {
      const mapper = MapperFactory.createPurchaseOrderMapper('azure');
      expect(mapper).toBeInstanceOf(AzurePurchaseOrderMapper);
      expect(mapper.getModelType()).toBe('azure');
    });

    it('should fall back to AzurePurchaseOrderMapper when an invalid model type is specified', () => {
      const mapper = MapperFactory.createPurchaseOrderMapper('invalid-model');
      expect(mapper).toBeInstanceOf(AzurePurchaseOrderMapper);
      expect(mapper.getModelType()).toBe('azure');
      expect(console.warn).toHaveBeenCalledWith(
        'Mapper implementation for model type "invalid-model" not found. Using default Azure implementation.'
      );
    });
  });
});