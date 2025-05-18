/**
 * @module repositories/vendorRepository
 */
const { Vendor } = require('../models');

/**
 * Repository class to handle database operations for Vendor entity
 * @class VendorRepository
 */
class VendorRepository {
  /**
   * Find a vendor by their ID
   * @async
   * @param {number|string} id - The unique identifier of the vendor
   * @returns {Promise<Object|null>} The vendor data object or null if not found
   */
  async findById(id) {
    const vendor = await Vendor.findByPk(id);
    return vendor ? vendor.get({ plain: true }) : null;
  }

  /**
   * Find a vendor by specified attributes
   * @async
   * @param {Object} attributes - Object containing attributes to search for (e.g., {name: 'Vendor Name', email: 'vendor@example.com'})
   * @returns {Promise<Object|null>} The vendor data object or null if not found
   */
  async findByAttributes(attributes) {
    const vendor = await Vendor.findOne({ where: attributes });
    return vendor ? vendor.get({ plain: true }) : null;
  }

  /**
   * Create a new vendor in the database
   * @async
   * @param {Object} vendorData - Object containing vendor data
   * @param {string} [vendorData.name] - Vendor name
   * @param {string} [vendorData.email] - Vendor email
   * @param {string} [vendorData.address] - Vendor address
   * @param {string} [vendorData.phone] - Vendor phone number
   * @returns {Promise<Object>} The created vendor data object
   */
  async create(vendorData) {
    const vendor = await Vendor.create(vendorData);
    return vendor.get({ plain: true });
  }
}

module.exports = VendorRepository;