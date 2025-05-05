'use strict';

const InvoiceMapperService = require('../../../src/services/invoiceMapperService/invoiceMapperService');
const MapperFactory = require('../../../src/services/mapperService/mapperFactory');

// Mock the dependencies
jest.mock('../../../src/services/mapperService/mapperFactory');

describe('InvoiceMapperService', () => {
  let mockInvoiceMapper;
  
  beforeEach(() => {
    // Create a mock invoice mapper that will be returned by the factory
    mockInvoiceMapper = {
      mapToInvoiceModel: jest.fn().mockReturnValue({ mockInvoice: 'data' }),
      getModelType: jest.fn().mockReturnValue('azure')
    };
    
    // Setup the MapperFactory mock to return our mock mapper
    MapperFactory.createInvoiceMapper = jest.fn().mockReturnValue(mockInvoiceMapper);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with default model type "azure"', () => {
      const service = new InvoiceMapperService();
      expect(MapperFactory.createInvoiceMapper).toHaveBeenCalledWith('azure');
      expect(service.getModelType()).toBe('azure');
    });
    
    it('should initialize with specified model type', () => {
      const service = new InvoiceMapperService('google');
      expect(MapperFactory.createInvoiceMapper).toHaveBeenCalledWith('google');
      expect(service.modelType).toBe('google');
    });
  });
  
  describe('mapToInvoiceModel', () => {
    it('should call mapper.mapToInvoiceModel with correct parameters', () => {
      const service = new InvoiceMapperService();
      const ocrResult = { data: 'test' };
      const partnerId = 'partner-123';
      
      const result = service.mapToInvoiceModel(ocrResult, partnerId);
      
      expect(mockInvoiceMapper.mapToInvoiceModel).toHaveBeenCalledWith(ocrResult, partnerId);
      expect(result).toEqual({ mockInvoice: 'data' });
    });
  });
  
  describe('setModelType', () => {
    it('should not change mapper if model type remains the same', () => {
      const service = new InvoiceMapperService('azure');
      
      // Clear initial setup calls
      MapperFactory.createInvoiceMapper.mockClear();
      
      service.setModelType('azure');
      
      expect(MapperFactory.createInvoiceMapper).not.toHaveBeenCalled();
    });
    
    it('should update mapper if model type changes', () => {
      const service = new InvoiceMapperService('azure');
      
      // Clear initial setup calls
      MapperFactory.createInvoiceMapper.mockClear();
      
      service.setModelType('google');
      
      expect(MapperFactory.createInvoiceMapper).toHaveBeenCalledWith('google');
      expect(service.modelType).toBe('google');
    });
  });
  
  describe('getModelType', () => {
    it('should return the current model type', () => {
      const service = new InvoiceMapperService('custom-model');
      expect(service.getModelType()).toBe('custom-model');
    });
  });
});