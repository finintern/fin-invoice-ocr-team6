'use strict';

const PurchaseOrderMapperService = require('../../../src/services/purchaseOrderMapperService/purchaseOrderMapperService');
const MapperFactory = require('../../../src/services/mapperService/mapperFactory');

// Mock the dependencies
jest.mock('../../../src/services/mapperService/mapperFactory');

describe('PurchaseOrderMapperService', () => {
  let mockPurchaseOrderMapper;
  
  beforeEach(() => {
    // Create a mock purchase order mapper that will be returned by the factory
    mockPurchaseOrderMapper = {
      mapToPurchaseOrderModel: jest.fn().mockReturnValue({ mockPurchaseOrder: 'data' }),
      getModelType: jest.fn().mockReturnValue('azure')
    };
    
    // Setup the MapperFactory mock to return our mock mapper
    MapperFactory.createPurchaseOrderMapper = jest.fn().mockReturnValue(mockPurchaseOrderMapper);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with default model type "azure"', () => {
      const service = new PurchaseOrderMapperService();
      expect(MapperFactory.createPurchaseOrderMapper).toHaveBeenCalledWith('azure');
      expect(service.getModelType()).toBe('azure');
    });
    
    it('should initialize with specified model type', () => {
      const service = new PurchaseOrderMapperService('google');
      expect(MapperFactory.createPurchaseOrderMapper).toHaveBeenCalledWith('google');
      expect(service.modelType).toBe('google');
    });
  });
  
  describe('mapToPurchaseOrderModel', () => {
    it('should call mapper.mapToPurchaseOrderModel with correct parameters', () => {
      const service = new PurchaseOrderMapperService();
      const ocrResult = { data: 'test' };
      const partnerId = 'partner-123';
      
      const result = service.mapToPurchaseOrderModel(ocrResult, partnerId);
      
      expect(mockPurchaseOrderMapper.mapToPurchaseOrderModel).toHaveBeenCalledWith(ocrResult, partnerId);
      expect(result).toEqual({ mockPurchaseOrder: 'data' });
    });
  });
  
  describe('setModelType', () => {
    it('should not change mapper if model type remains the same', () => {
      const service = new PurchaseOrderMapperService('azure');
      
      // Clear initial setup calls
      MapperFactory.createPurchaseOrderMapper.mockClear();
      
      service.setModelType('azure');
      
      expect(MapperFactory.createPurchaseOrderMapper).not.toHaveBeenCalled();
    });
    
    it('should update mapper if model type changes', () => {
      const service = new PurchaseOrderMapperService('azure');
      
      // Clear initial setup calls
      MapperFactory.createPurchaseOrderMapper.mockClear();
      
      service.setModelType('google');
      
      expect(MapperFactory.createPurchaseOrderMapper).toHaveBeenCalledWith('google');
      expect(service.modelType).toBe('google');
    });
  });
  
  describe('getModelType', () => {
    it('should return the current model type', () => {
      const service = new PurchaseOrderMapperService('custom-model');
      expect(service.getModelType()).toBe('custom-model');
    });
  });
});