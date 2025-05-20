'use strict';
const DocumentStatus = require('../../../src/models/enums/DocumentStatus');
const { faker } = require('@faker-js/faker');

function createInvoice(invoiceId, partnerId, status) {
  return {
    id: invoiceId || faker.datatype.uuid(),
    invoice_number: `INV-${faker.number.int({ min: 1, max: 100 })}`,
    invoice_date: faker.date.past(),
    due_date: faker.date.future(),
    purchase_order_id: `PO-${faker.number.int({ min: 1, max: 100 })}`,
    total_amount: faker.commerce.price(),
    subtotal_amount: faker.commerce.price(),
    discount_amount: faker.commerce.price(),
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
    const invoices = [
      // Invoice of dummy partner
      createInvoice("dummy_invoice_id", "uuid_dummy", DocumentStatus.ANALYZED),
      // Invoice of another partner, forbidden to be accessed by dummy partner
      createInvoice("another_invoice_id", "uuid_another", DocumentStatus.ANALYZED),
      // Invoice of dummy partner, processing status
      createInvoice("dummy_invoice_id_processing", "uuid_dummy", DocumentStatus.PROCESSING),
      // Invoice of dummy partner, failed status
      createInvoice("dummy_invoice_id_failed", "uuid_dummy", DocumentStatus.FAILED),
      // Invoice of another partner, failed status (test forbidden non-analyzed)
      createInvoice("another_invoice_id_failed", "uuid_another", DocumentStatus.FAILED)
    ];
    return queryInterface.bulkInsert('Invoice', invoices, {});
  },

  down: async (queryInterface) => {
    return queryInterface.bulkDelete('Invoice', null, {});
  }
};        