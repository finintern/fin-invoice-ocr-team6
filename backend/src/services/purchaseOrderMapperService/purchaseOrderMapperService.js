'use strict';
const MapperFactory = require('../mapperService/mapperFactory');

/**
 * Service for processing and mapping purchase order OCR results
 */
class PurchaseOrderMapperService {
  /**
   * Creates a new PurchaseOrderMapperService instance
   * @param {string} modelType - The model type to use (e.g., 'azure', 'google')
   */
  constructor(modelType = 'azure') {
    this.modelType = modelType;
    this.mapper = MapperFactory.createPurchaseOrderMapper(modelType);
  }

  /**
   * Maps OCR result to PurchaseOrder model format
   * @param {Object} ocrResult - Raw OCR result
   * @param {string} partnerId - UUID of the user uploading the purchase order
   * @returns {Object} PurchaseOrder and related data ready for database
   */
  mapToPurchaseOrderModel(ocrResult, partnerId) {
    return this.mapper.mapToPurchaseOrderModel(ocrResult, partnerId);
  }

  /**
   * Changes the model type used for analysis
   * @param {string} newModelType - The new model type to use
   */
  setModelType(newModelType) {
    if (this.modelType !== newModelType) {
      this.modelType = newModelType;
      this.mapper = MapperFactory.createPurchaseOrderMapper(newModelType);
    }
  }

  /**
   * Gets the current model type
   * @returns {string} The current model type
   */
  getModelType() {
    return this.modelType;
  }
}

module.exports = PurchaseOrderMapperService;