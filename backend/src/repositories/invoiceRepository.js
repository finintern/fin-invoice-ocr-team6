/**
 * @module repositories/invoiceRepository
 */
const { Invoice } = require('../models');

/**
 * Repository class to handle database operations for Invoice entity
 * @class InvoiceRepository
 */
class InvoiceRepository {
  /**
   * Create a new invoice record in the database
   * @async
   * @param {Object} invoiceData - Object containing invoice data to be created
   * @returns {Promise<Object>} The created invoice instance
   */
  async createInitial(invoiceData) {
    return await Invoice.create(invoiceData);
  }

  /**
   * Find an invoice by its ID
   * @async
   * @param {number|string} id - The unique identifier of the invoice
   * @returns {Promise<Object|null>} The invoice data object or null if not found
   */
  async findById(id) {
    const invoice = await Invoice.findOne({ where: { id } });
    return invoice ? invoice.get({ plain: true }) : null;
  }

  /**
   * Update multiple fields of an invoice
   * @async
   * @param {number|string} id - The unique identifier of the invoice to update
   * @param {Object} data - Object containing fields to update
   * @returns {Promise<void>}
   */
  async update(id, data) {
    await Invoice.update(data, { where: { id } });
  }

  /**
   * Update the status of an invoice
   * @async
   * @param {number|string} id - The unique identifier of the invoice to update
   * @param {string} status - The new status value
   * @returns {Promise<void>}
   */
  async updateStatus(id, status) {
    await Invoice.update({ status }, { where: { id } });
  }

  /**
   * Update the customer ID associated with an invoice
   * @async
   * @param {number|string} id - The unique identifier of the invoice to update
   * @param {number|string} customerId - The customer ID to associate with the invoice
   * @returns {Promise<void>}
   */
  async updateCustomerId(id, customerId) {
    await Invoice.update({ customer_id: customerId }, { where: { id } });
  }

  /**
   * Update the vendor ID associated with an invoice
   * @async
   * @param {number|string} id - The unique identifier of the invoice to update
   * @param {number|string} vendorId - The vendor ID to associate with the invoice
   * @returns {Promise<void>}
   */
  async updateVendorId(id, vendorId) {
    await Invoice.update({ vendor_id: vendorId }, { where: { id } });
  }

  /**
   * Soft delete an invoice (marks as deleted but keeps in database)
   * @async
   * @param {number|string} id - The unique identifier of the invoice to delete
   * @returns {Promise<number>} 1 if successfully deleted, 0 if invoice not found
   */
  async delete(id) {
    const invoice = await Invoice.findByPk(id);
    if (invoice) {
      await invoice.destroy();
      return 1;
    }
    return 0;
  }
  
  /**
   * Permanently delete an invoice from the database
   * @async
   * @param {number|string} id - The unique identifier of the invoice to delete
   * @returns {Promise<void>}
   */
  async hardDelete(id) {
    await Invoice.destroy({ 
      where: { id },
      force: true  
    });
  }

  /**
   * Restore a previously soft-deleted invoice
   * @async
   * @param {number|string} id - The unique identifier of the invoice to restore
   * @returns {Promise<boolean>} true if successfully restored, false otherwise
   */
  async restore(id) {
    const invoice = await Invoice.findByPk(id, { paranoid: false });
    if (invoice && invoice.deleted_at) {
      await invoice.restore(); 
      return true;
    }
    return false;
  }
}

module.exports = InvoiceRepository;