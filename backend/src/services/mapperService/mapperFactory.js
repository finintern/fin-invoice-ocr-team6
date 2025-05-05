'use strict';

/**
 * Factory class for creating document mappers
 */
class MapperFactory {
  /**
   * Creates an invoice mapper instance for the specified model type
   * @param {string} modelType - The model type to use (e.g., 'azure', 'google')
   * @returns {InvoiceMapper} An appropriate invoice mapper instance
   */
  static createInvoiceMapper(modelType = 'azure') {
    // Dynamically import the appropriate mapper implementation
    try {
      const mapperImplementation = require(`../modelImplementations/${modelType}InvoiceMapper`);
      return new mapperImplementation(modelType);
    } catch (error) {
      console.warn(`Mapper implementation for model type "${modelType}" not found. Using default Azure implementation.`);
      const AzureInvoiceMapper = require('../modelImplementations/azureInvoiceMapper');
      return new AzureInvoiceMapper('azure');
    }
  }

  /**
   * Creates a purchase order mapper instance for the specified model type
   * @param {string} modelType - The model type to use (e.g., 'azure', 'google')
   * @returns {PurchaseOrderMapper} An appropriate purchase order mapper instance
   */
  static createPurchaseOrderMapper(modelType = 'azure') {
    // Dynamically import the appropriate mapper implementation
    try {
      const mapperImplementation = require(`../modelImplementations/${modelType}PurchaseOrderMapper`);
      return new mapperImplementation(modelType);
    } catch (error) {
      console.warn(`Mapper implementation for model type "${modelType}" not found. Using default Azure implementation.`);
      const AzurePurchaseOrderMapper = require('../modelImplementations/azurePurchaseOrderMapper');
      return new AzurePurchaseOrderMapper('azure');
    }
  }
}

module.exports = MapperFactory;