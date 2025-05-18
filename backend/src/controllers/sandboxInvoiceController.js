const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DocumentStatus = require('../models/enums/DocumentStatus');
const { AzureInvoiceMapper } = require('../services/invoiceMapperService/invoiceMapperService');

// Load the sample invoice analysis JSON
const sampleInvoiceData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../services/analysis/sample-invoice.json'),
    'utf8'
  )
);

/**
 * Mock upload invoice controller that initiates invoice processing
 */
const mockUploadInvoice = async (req, res) => {
  try {    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }      
    const { buffer, originalname } = req.file;
    
    // Generate a UUID for the invoice
    const invoiceId = uuidv4();
    
    // Create a simplified response format that matches the expected API
    const response = {
      message: {
        message: "Invoice upload initiated",
        id: invoiceId,
        status: DocumentStatus.PROCESSING
      }
    };

    // Log the mock upload
    console.log(`[SANDBOX] Mock invoice upload initiated: ${originalname}, size: ${buffer.length} bytes`);

    // Return the response
    return res.status(200).json(response);
  } catch (error) {
    console.error("[SANDBOX] Error in mock invoice upload:", error);
    return res.status(500).json({
      message: "Error in sandbox invoice processing",
      error: error.message,
    });
  }
};

/**
 * Mock get invoice status by ID
 */
const mockGetInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create a mock invoice status with only id and status
    const mockStatus = {
      id: id,
      status: DocumentStatus.ANALYZED // Using the real status enum
    };

    // Log the mock request
    console.log(`[SANDBOX] Mock get invoice status for ID: ${id}`);

    return res.status(200).json(mockStatus);
  } catch (error) {
    console.error("[SANDBOX] Error in mock get invoice status:", error);
    return res.status(500).json({
      message: "Error in sandbox invoice status retrieval",
      error: error.message,
    });
  }
};

/**
 * Mock get invoice by ID
 */
const mockGetInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Static partner ID for sandbox testing - use a valid UUID
    const partnerId = "123e4567-e89b-12d3-a456-426614174001";
    
    // Use the real invoice mapper to create a mock invoice response
    const invoiceMapper = new AzureInvoiceMapper();
    const mappedData = invoiceMapper.mapToInvoiceModel(sampleInvoiceData, partnerId);
    
    // Format date strings to ISO strings to match expected format
    const invoiceDate = new Date(mappedData.invoiceData.invoice_date);
    const dueDate = new Date(mappedData.invoiceData.due_date);
    
    // Create a response format that matches the expected API
    const response = {
      data: {
        documents: [
          {
            header: {
              invoice_details: {
                invoice_number: mappedData.invoiceData.invoice_number,
                purchase_order_id: "12345",
                invoice_date: invoiceDate.toISOString(),
                due_date: dueDate.toISOString(),
                payment_terms: mappedData.invoiceData.payment_terms
              },
              vendor_details: {
                name: mappedData.vendorData.name.split(' - ')[0],
                address: mappedData.vendorData.address,
                recipient_name: mappedData.vendorData.recipient_name,
                tax_id: mappedData.vendorData.tax_id
              },
              customer_details: {
                id: "1aca895c-0b1f-4536-a482-733398a84a9a",
                name: mappedData.customerData.name,
                recipient_name: mappedData.customerData.recipient_name,
                address: mappedData.customerData.address,
                tax_id: mappedData.customerData.tax_id
              },
              financial_details: {
                currency: {
                  currency_symbol: mappedData.invoiceData.currency_symbol,
                  currency_code: mappedData.invoiceData.currency_code
                },
                total_amount: mappedData.invoiceData.total_amount.toString(),
                subtotal_amount: mappedData.invoiceData.subtotal_amount.toString(),
                discount_amount: mappedData.invoiceData.discount_amount,
                total_tax_amount: mappedData.invoiceData.tax_amount.toString()
              }
            },
            items: mappedData.itemsData.map(item => ({
              amount: item.amount.toString(),
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unitPrice.toString()
            }))
          }
        ],
        documentUrl: `https://s3.ap-southeast-3.amazonaws.com/sandbox.intern.fineksi.com/${id}.pdf`
      }
    };

    // Log the mock request
    console.log(`[SANDBOX] Mock get invoice details for ID: ${id}`);

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SANDBOX] Error in mock get invoice details:", error);
    return res.status(500).json({
      message: "Error in sandbox invoice details retrieval",
      error: error.message,
    });
  }
};

module.exports = {
  mockUploadInvoice,
  mockGetInvoiceStatus,
  mockGetInvoiceById
};
