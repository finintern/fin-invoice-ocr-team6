'use strict';
const MapperFactory = require('../mapperService/mapperFactory');

/**
 * Service for processing and mapping invoice OCR results
 */
class InvoiceMapperService {
  /**
   * Creates a new InvoiceMapperService instance
   * @param {string} modelType - The model type to use (e.g., 'azure', 'google')
   */
  constructor(modelType = 'azure') {
    this.modelType = modelType;
    this.mapper = MapperFactory.createInvoiceMapper(modelType);
  }

  /**
   * Maps OCR result to Invoice model format
   * @param {Object} ocrResult - Raw OCR result
   * @param {string} partnerId - UUID of the user uploading the invoice
   * @returns {Object} Invoice and related data ready for database
   */
  mapToInvoiceModel(ocrResult, partnerId) {
    return this.mapper.mapToInvoiceModel(ocrResult, partnerId);
  }

  /**
   * Changes the model type used for analysis
   * @param {string} newModelType - The new model type to use
   */
  setModelType(newModelType) {
    if (this.modelType !== newModelType) {
      this.modelType = newModelType;
      this.mapper = MapperFactory.createInvoiceMapper(newModelType);
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

module.exports = InvoiceMapperService;