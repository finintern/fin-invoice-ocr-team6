const DocumentStatus = require('../../models/enums/DocumentStatus.js');
class InvoiceResponseFormatter {
  formatStatusResponse(invoice, status, customMessage = null) {
    // Check if status exists in the statusMessages map, if not, use customMessage
    const statusMessages = {
      [DocumentStatus.PROCESSING]: "Invoice is still being processed. Please try again later.",
      [DocumentStatus.FAILED]: "Invoice processing failed. Please re-upload the document.",
    };

    // Use custom message if provided, otherwise fallback to status message
    const message = customMessage || statusMessages[status];

    // Safely access file_url with null checks
    const fileUrl = invoice && invoice.file_url ? invoice.file_url : null;

    return {
      message: message,
      data: {
        documents: [],
        documentUrl: fileUrl
      }
    };
  }

  formatInvoiceResponse(invoice, items, customer, vendor) {
    const formattedInvoice = {
      header: {
        invoice_details: {
          invoice_number: invoice.invoice_number,
          purchase_order_id: invoice.purchase_order_id,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          payment_terms: invoice.payment_terms
        },
        vendor_details: this._formatVendorDetails(vendor),
        customer_details: this._formatCustomerDetails(customer),
        financial_details: {
          currency: {
            currency_symbol: invoice.currency_symbol,
            currency_code: invoice.currency_code
          },
          total_amount: invoice.total_amount,
          subtotal_amount: invoice.subtotal_amount,
          discount_amount: invoice.discount_amount,
          total_tax_amount: invoice.tax_amount,
        }
      },
      items: this._formatItems(items)
    };

    return {
      data: {
        documents: [formattedInvoice],
        documentUrl: invoice.file_url || null
      }
    };
  }

  _formatVendorDetails(vendor) {
    if (!vendor) {
      return {
        name: null,
        address: "",
        recipient_name: null,
        tax_id: null
      };
    }

    return {
      name: vendor.name,
      address: vendor.address || "",
      recipient_name: vendor.recipient_name,
      tax_id: vendor.tax_id
    };
  }

  _formatCustomerDetails(customer) {
    if (!customer) {
      return {
        id: null,
        name: null,
        recipient_name: null,
        address: "",
        tax_id: null
      };
    }

    return {
      id: customer.uuid,
      name: customer.name,
      recipient_name: customer.recipient_name,
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

module.exports = InvoiceResponseFormatter;