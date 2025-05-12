/**
 * @module repositories/itemRepository
 */
const { Item } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Repository class to handle database operations for Item entity
 * @class ItemRepository
 */
class ItemRepository {
  /**
   * Find an item by description or create it if it doesn't exist
   * @async
   * @param {string} description - The description of the item to find or create
   * @returns {Promise<Object>} The found or created item data object
   */
  async findOrCreateItem(description) {
    const [item] = await Item.findOrCreate({
      where: { description },
      defaults: {
        uuid: uuidv4(),
        description
      }
    });
    return item.get({ plain: true });
  }

  /**
   * Create a new item associated with a specific document
   * @async
   * @param {string} docType - The type of document (e.g., 'invoice', 'receipt')
   * @param {number|string} docId - The ID of the document this item belongs to
   * @param {Object} itemData - Object containing item details
   * @param {string} itemData.description - Description of the item
   * @param {number} itemData.quantity - Quantity of the item
   * @param {string} itemData.unit - Unit of measurement (e.g., 'piece', 'kg')
   * @param {number} itemData.unit_price - Price per unit
   * @param {number} itemData.amount - Total amount (typically quantity * unit_price)
   * @returns {Promise<Object>} The created item instance
   */
  async createDocumentItem(docType, docId, itemData) {
    console.log("creating document item",docType, docId, itemData);
    return await Item.create({
      uuid: uuidv4(),
      document_type: docType,
      document_id: docId,
      description: itemData.description,
      quantity: itemData.quantity,
      unit: itemData.unit,
      unit_price: itemData.unit_price,
      amount: itemData.amount
    });
  }

  /**
   * Find all items associated with a specific document
   * @async
   * @param {number|string} docId - The ID of the document to find items for
   * @param {string} docType - The type of document (e.g., 'invoice', 'receipt')
   * @returns {Promise<Array<Object>>} Array of item data objects
   */
  async findItemsByDocumentId(docId, docType) {
    const items = await Item.findAll({
      where: {
        document_type: docType,
        document_id: docId
      }
    });
    return items.map(item => item.get({ plain: true }));
  }
}

module.exports = ItemRepository;