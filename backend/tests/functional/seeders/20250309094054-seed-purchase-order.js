'use strict';
const { v4: uuidv4 } = require('uuid');
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');

function createPurchaseOrder(poId, partnerId, status) {
  return {
    id: poId || uuidv4(),
    po_number: `PO-${Math.floor(Math.random() * 100)}`,
    due_date: new Date('2024-01-01'),
    total_amount: Math.floor(Math.random() * 10000),
    subtotal_amount: Math.floor(Math.random() * 10000),
    discount_amount: Math.floor(Math.random() * 1000),
    payment_terms: "Net 30",
    file_url: "https://example.com/invoices.pdf",
    analysis_json_url: "https://example.com/analysis/invoices.json",
    status,
    partner_id: partnerId || "uuid_dummy",
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

module.exports = {
  up: async (queryInterface) => {
    const purchaseOrders = [
      // Purchase Order of dummy partner
      createPurchaseOrder("dummy_po_id", "uuid_dummy", DocumentStatus.ANALYZED),
      // Purchase Order of another partner, forbidden to be accessed by dummy partner
      createPurchaseOrder("another_po_id", "uuid_another", DocumentStatus.ANALYZED),
      // Purchase Order of dummy partner, processing status
      createPurchaseOrder("dummy_po_id_processing", "uuid_dummy", DocumentStatus.PROCESSING),
      // Purchase Order of dummy partner, failed status
      createPurchaseOrder("dummy_po_id_failed", "uuid_dummy", DocumentStatus.FAILED),
      // Purchase Order of another partner, failed status (test forbidden non-analyzed)
      createPurchaseOrder("another_po_id_failed", "uuid_another", DocumentStatus.FAILED)
    ]

    return queryInterface.bulkInsert('PurchaseOrder', purchaseOrders, {});
  },

  down: async (queryInterface) => {
    return queryInterface.bulkDelete('PurchaseOrder', null, {});
  }
};