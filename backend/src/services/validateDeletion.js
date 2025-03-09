const Invoice = require("../models/invoice");

/**
 * Class for handling invoice deletion validation logic
 */
class ValidateDeletion {
  /**
   * Validates if an invoice can be deleted by a partner.
   * 
   * @param {string} partnerId - The ID of the partner requesting deletion.
   * @param {number} invoiceId - The ID of the invoice to be deleted.
   * @returns {Promise<Object>} The invoice object if deletion is allowed.
   * @throws {Error} If the invoice is not found, unauthorized, or cannot be deleted.
   */
  async validateInvoiceDeletion(partnerId, invoiceId) {
    if (!invoiceId) {
      throw new Error("Invalid invoice ID");
    }
  
    const invoice = await Invoice.findByPk(invoiceId);
    
    if (!invoice) {
      throw new Error("Invoice not found");
    }
  
    if (invoice.partner_id !== partnerId) {
      throw new Error("Unauthorized: You do not own this invoice");
    }
  
    if (invoice.status !== "Analyzed") {
      throw new Error("Invoice cannot be deleted unless it is Analyzed");
    }
  
    return invoice;
  }
}

module.exports = new ValidateDeletion();