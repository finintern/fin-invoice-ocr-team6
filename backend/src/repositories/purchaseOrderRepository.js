/**
 * @module repositories/purchaseOrderRepository
 */
const { PurchaseOrder } = require('../models');

/**
 * Repository class to handle database operations for PurchaseOrder entity
 * @class PurchaseOrderRepository
 */
class PurchaseOrderRepository {
    /**
     * Find a purchase order by its ID
     * @async
     * @param {number|string} id - The unique identifier of the purchase order
     * @returns {Promise<Object|null>} The purchase order instance or null if not found
     */
    async findById(id) {
        return await PurchaseOrder.findByPk(id);
    }

    /**
     * Create a new purchase order record in the database
     * @async
     * @param {Object} purchaseOrderData - Object containing purchase order data
     * @returns {Promise<Object>} The created purchase order instance
     */
    async createInitial(purchaseOrderData) {
        return await PurchaseOrder.create(purchaseOrderData);
    }

    /**
     * Update multiple fields of a purchase order
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to update
     * @param {Object} data - Object containing fields to update
     * @returns {Promise<Object>} The updated purchase order instance
     */
    async update(id, data) {
        await PurchaseOrder.update(data, {
            where: { id }
        });
        return await this.findById(id);
    }

    /**
     * Update the status of a purchase order
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to update
     * @param {string} status - The new status value
     * @returns {Promise<Array>} Result of the update operation
     */
    async updateStatus(id, status) {
        return await PurchaseOrder.update({ status }, {
            where: { id }
        });
    }

    /**
     * Update the customer ID associated with a purchase order
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to update
     * @param {number|string} customer_id - The customer ID to associate with the purchase order
     * @returns {Promise<Array>} Result of the update operation
     */
    async updateCustomerId(id, customer_id) {
        return await PurchaseOrder.update({ customer_id }, {
            where: { id }
        });
    }

    /**
     * Update the vendor ID associated with a purchase order
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to update
     * @param {number|string} vendor_id - The vendor ID to associate with the purchase order
     * @returns {Promise<Array>} Result of the update operation
     */
    async updateVendorId(id, vendor_id) {
        return await PurchaseOrder.update({ vendor_id }, {
            where: { id }
        });
    }

    /**
     * Soft delete a purchase order (marks as deleted but keeps in database)
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to delete
     * @returns {Promise<number>} 1 if successfully deleted, 0 if purchase order not found
     */
    async delete(id) {
        const purchaseOrder = await PurchaseOrder.findByPk(id);
        if (purchaseOrder) {
            await purchaseOrder.destroy();
            return 1;
        }
        return 0;
    }
    
    /**
     * Permanently delete a purchase order from the database
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to delete
     * @returns {Promise<void>}
     */
    async hardDelete(id) {
        await PurchaseOrder.destroy({ 
            where: { id },
            force: true  
        });
    }
    
    /**
     * Restore a previously soft-deleted purchase order
     * @async
     * @param {number|string} id - The unique identifier of the purchase order to restore
     * @returns {Promise<boolean>} true if successfully restored, false otherwise
     */
    async restore(id) {
        const purchaseOrder = await PurchaseOrder.findByPk(id, { paranoid: false });
        if (purchaseOrder?.deleted_at) {
            await purchaseOrder.restore();
            return true;
        }
        return false;
    } 
}

module.exports = PurchaseOrderRepository;