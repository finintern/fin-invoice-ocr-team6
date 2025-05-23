const DocumentStatus = require('../../models/enums/DocumentStatus.js');
class PurchaseOrderResponseFormatter {
  formatStatusResponse(purchaseOrder, status) {
    if (!purchaseOrder) {
      throw new Error('purchaseOrder is not provided');
    }

    if (!purchaseOrder.file_url) {
      throw new Error('purchaseOrder.file_url is not provided');
    }

    const statusMessages = {
      [DocumentStatus.PROCESSING]: "Purchase Order is still being processed. Please try again later.",
      [DocumentStatus.FAILED]: "Purchase Order processing failed. Please re-upload the document.",
    };

    if (status === DocumentStatus.ANALYZED) {
      throw new Error(`Invalid status ${DocumentStatus.ANALYZED}. Use formatPurchaseOrderResponse instead.`); 
    }

    if (!Object.keys(statusMessages).includes(status)) {
      throw new Error(`Invalid status ${status}`);
    }

    const message = statusMessages[status];
    const fileUrl = purchaseOrder.file_url;
    return {
      message: message,
      data: {
        documents: [],
        documentUrl: fileUrl
      }
    };
  }

  formatPurchaseOrderResponse(purchaseOrder, items = [], customer = null, vendor = null) {
    const formattedPurchaseOrder = {
      header: {
        purchase_order_details: {
          purchase_order_id: purchaseOrder.po_number,
          due_date: purchaseOrder.due_date,
          payment_terms: purchaseOrder.payment_terms,
        },
        vendor_details: this._formatVendorDetails(vendor),
        customer_details: this._formatCustomerDetails(customer),
        financial_details: {
          currency: purchaseOrder.currency_code,
          total_amount: purchaseOrder.total_amount,
          subtotal_amount: purchaseOrder.subtotal_amount,
          discount_amount: purchaseOrder.discount_amount,
          total_tax_amount: purchaseOrder.tax_amount,
        }
      },
      items: this._formatItems(items)
    };

    return {
      data: {
        documents: [formattedPurchaseOrder],
        documentUrl: purchaseOrder.file_url
      }
    };
  }

  _formatVendorDetails(vendor) {
    if (!vendor) {
      return {
        name: null,
        address: "",
        contact_name: null,
        tax_id: null
      };
    }

    return {
      name: vendor.name,
      address: vendor.address || "",
      contact_name: vendor.recipient_name,
      tax_id: vendor.tax_id
    };
  }

  _formatCustomerDetails(customer) {
    if (!customer) {
      return {
        id: null,
        name: null,
        contact_name: null,
        address: "",
        tax_id: null
      };
    }

    return {
      id: customer.uuid,
      name: customer.name,
      contact_name: customer.recipient_name,
      address: customer.address || "",
      tax_id: customer.tax_id
    };
  }

  _formatItems(items) {
    if (!items || !Array.isArray(items)) {
      return [];
    }

    return items.map(item => ({
      amount: item.amount,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price
    }));
  }
}

module.exports = PurchaseOrderResponseFormatter;
