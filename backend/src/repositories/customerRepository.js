/**
 * @module repositories/customerRepository
 */
const { Customer } = require('../models');

/**
 * Repository class to handle database operations for Customer entity
 * @class CustomerRepository
 */
class CustomerRepository {
  /**
   * Find a customer by their ID
   * @async
   * @param {number|string} id - The unique identifier of the customer
   * @returns {Promise<Object|null>} The customer data object or null if not found
   */
  async findById(id) {
    const customer = await Customer.findByPk(id);
    return customer ? customer.get({ plain: true }) : null;
  }

  /**
   * Find a customer by specified attributes
   * @async
   * @param {Object} attributes - Object containing attributes to search for (e.g., {email: 'example@mail.com'})
   * @returns {Promise<Object|null>} The customer data object or null if not found
   */
  async findByAttributes(attributes) {
    const customer = await Customer.findOne({ where: attributes });
    return customer ? customer.get({ plain: true }) : null;
  }

  /**
   * Create a new customer in the database
   * @async
   * @param {Object} customerData - Object containing customer data
   * @param {string} [customerData.name] - Customer name
   * @param {string} [customerData.email] - Customer email
   * @param {string} [customerData.phone] - Customer phone number
   * @param {string} [customerData.address] - Customer address
   * @returns {Promise<Object>} The created customer data object
   */
  async create(customerData) {
    const customer = await Customer.create(customerData);
    return customer.get({ plain: true });
  }
}

module.exports = CustomerRepository;