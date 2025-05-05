'use strict';

/**
 * Base Mapper interface for document mapping
 */
class DocumentMapper {
  /**
   * Creates a new DocumentMapper instance
   * @param {string} modelType - The type of model to use for document analysis (e.g., 'azure', 'google')
   */
  constructor(modelType = 'azure') {
    this.modelType = modelType;
  }

  /**
   * Gets the current model type
   * @returns {string} The current model type
   */
  getModelType() {
    return this.modelType;
  }

  /**
   * Sets the model type for document analysis
   * @param {string} modelType - The model type to use (e.g., 'azure', 'google')
   */
  setModelType(modelType) {
    this.modelType = modelType;
  }

  /**
   * Maps OCR result to model format
   * @param {Object} ocrResult - Raw OCR result
   * @param {string} partnerId - Partner ID
   * @returns {Object} Data ready for database
   */
  mapToModel(_ocrResult, _partnerId) {
    throw new Error('Method not implemented');
  }

  /**
   * Generate a partner ID from vendor name
   * @param {string} vendorName - Name of the vendor
   * @returns {string} Generated partner ID
   */
  generatePartnerId(vendorName) {
    if (!vendorName) return 'unknown-vendor';
    let partnerId = vendorName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return partnerId.substring(0, 44);
  }
}

/**
 * Base Invoice Mapper interface
 * @extends DocumentMapper
 */
class InvoiceMapper extends DocumentMapper {
  /**
   * Creates a new InvoiceMapper instance
   * @param {string} modelType - The type of model to use for invoice analysis (e.g., 'azure', 'google')
   */
  constructor(modelType = 'azure') {
    super(modelType);
  }

  /**
   * Maps OCR result to Invoice model format
   * @param {Object} ocrResult - Raw OCR result
   * @param {string} partnerId - Partner ID
   * @returns {Object} Invoice data ready for database
   */
  mapToInvoiceModel(_ocrResult, _partnerId) {
    throw new Error('Method not implemented');
  }
}

/**
 * Base Purchase Order Mapper interface
 * @extends DocumentMapper
 */
class PurchaseOrderMapper extends DocumentMapper {
  /**
   * Creates a new PurchaseOrderMapper instance
   * @param {string} modelType - The type of model to use for purchase order analysis (e.g., 'azure', 'google')
   */
  constructor(modelType = 'azure') {
    super(modelType);
  }

  /**
   * Maps OCR result to Purchase Order model format
   * @param {Object} ocrResult - Raw OCR result
   * @param {string} partnerId - Partner ID
   * @returns {Object} Purchase Order data ready for database
   */
  mapToPurchaseOrderModel(_ocrResult, _partnerId) {
    throw new Error('Method not implemented');
  }
}

module.exports = {
  DocumentMapper,
  InvoiceMapper,
  PurchaseOrderMapper
};