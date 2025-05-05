'use strict';
const DocumentStatus = require('../../models/enums/DocumentStatus');
const FieldParser = require('../invoiceMapperService/FieldParserService');
const EntityExtractor = require('../invoiceMapperService/entityExtractorService');
const { PurchaseOrderMapper } = require('../mapperService/baseMapper');

/**
 * Azure-specific implementation of PurchaseOrderMapper
 * @extends PurchaseOrderMapper
 */
class AzurePurchaseOrderMapper extends PurchaseOrderMapper {
  /**
   * Creates a new AzurePurchaseOrderMapper instance
   * @param {string} modelType - The model type (should be 'azure')
   */
  constructor(modelType = 'azure') {
    super(modelType);
    this.fieldParser = new FieldParser();
    this.EntityExtractor = new EntityExtractor(this.fieldParser);
  }

  /**
   * Maps OCR result to model format
   * @param {Object} ocrResult - Raw OCR result
   * @param {string} partnerId - Partner ID
   * @returns {Object} Purchase order data ready for database
   */
  mapToModel(ocrResult, partnerId) {
    return this.mapToPurchaseOrderModel(ocrResult, partnerId);
  }

  /**
   * Maps Azure OCR result to PurchaseOrder model format
   * @param {Object} ocrResult - Raw Azure OCR result
   * @param {string} partnerId - UUID of the user uploading the purchase order
   * @returns {Object} PurchaseOrder and customer data ready for database
   */
  mapToPurchaseOrderModel(ocrResult, partnerId) {
    if (!ocrResult?.documents?.[0]) {
      throw new Error('Invalid OCR result format');
    }

    if (!partnerId) {
      throw new Error('Partner ID is required');
    }

    const document = ocrResult.documents[0];
    const fields = document.fields || {};
    
    // Extract and validate dates
    const poNumber = this.fieldParser.getFieldContent(fields.PurchaseOrder || fields.PONumber);
    const poDate = this.fieldParser.parseDate(fields.InvoiceDate || fields.PODate);

    // Extract monetary values
    const totalAmount = this.fieldParser.parseCurrency(fields.InvoiceTotal || fields.Total);
    const subtotalAmount = this.fieldParser.parseCurrency(fields.SubTotal) || totalAmount;
    const discountAmount = this.fieldParser.parseCurrency(fields.TotalDiscount || fields.Discount);
    const taxAmount = this.fieldParser.parseCurrency(fields.TotalTax || fields.Tax);

    const totalAmountAmount = totalAmount.amount;
    const subtotalAmountAmount = subtotalAmount.amount || totalAmountAmount;
    const discountAmountAmount = discountAmount.amount;
    const taxAmountAmount = taxAmount.amount;

    const totalAmountCurrency = totalAmount.currency;
    const subtotalAmountCurrency = subtotalAmount.currency || totalAmountCurrency;
    const discountAmountCurrency = discountAmount.currency;
    const taxAmountCurrency = taxAmount.currency;

    const currency = totalAmountCurrency || subtotalAmountCurrency || discountAmountCurrency || taxAmountCurrency || { currencySymbol: null, currencyCode: null };

    // Extract payment terms
    const paymentTerms = this.fieldParser.getFieldContent(fields.PaymentTerm);

    // Extract line items
    const itemsData = this.EntityExtractor.extractLineItems(fields.Items);
    
    // Extract customer data into a separate object
    const customerData = this.EntityExtractor.extractCustomerData(fields);

    // Extract vendor data
    const vendorData = this.EntityExtractor.extractVendorData(fields);

    // Build purchase order data object matching our model requirements
    const purchaseOrderData = {
      po_number: poNumber, 
      due_date: poDate,
      total_amount: totalAmountAmount,
      subtotal_amount: subtotalAmountAmount,
      discount_amount: discountAmountAmount,
      payment_terms: paymentTerms,
      status: DocumentStatus.ANALYZED,
      partner_id: partnerId,

      // Additional data
      tax_amount: taxAmountAmount,
      currency_symbol: currency.currencySymbol,
      currency_code: currency.currencyCode
    };

    return {
      purchaseOrderData,
      customerData,
      vendorData,
      itemsData
    };
  }
}

// Export the class directly (this is the key fix)
module.exports = AzurePurchaseOrderMapper;