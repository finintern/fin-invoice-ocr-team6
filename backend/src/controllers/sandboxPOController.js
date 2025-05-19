const fs = require('fs');
const path = require('path');
const DocumentStatus = require('../models/enums/DocumentStatus');
const { AzurePurchaseOrderMapper } = require('../services/purchaseOrderMapperService/purchaseOrderMapperService');
const PurchaseOrderResponseFormatter = require('../services/purchaseOrder/purchaseOrderResponseFormatter');

// Load the sample purchase order analysis JSON
const samplePurchaseOrderData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../services/analysis/sample-purchase-order.json'),
    'utf8'
  )
);

/**
 * Mock upload purchase order controller that returns mock analysis and S3 URLs
 */
const mockUploadPurchaseOrder = async (req, res) => {
  try {    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }      
    const { buffer, originalname } = req.file;

    // Static partner ID for sandbox testing - use a valid UUID
    const purchaseOrderId = "123e4567-e89b-12d3-a456-426614174001";

    // Simplified response format
    const response = {
      message: {
        message: "Purchase order upload processed",
        id: purchaseOrderId,
        status: DocumentStatus.PROCESSING
      }
    };

    console.log(`[SANDBOX] Mock purchase order upload processed: ${originalname}, size: ${buffer.length} bytes`);

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SANDBOX] Error in mock purchase order upload:", error);
    return res.status(500).json({
      message: "Error in sandbox purchase order processing",
      error: error.message,
    });
  }
};

/**
 * Mock get purchase order status by ID
 */
const mockGetPurchaseOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create a mock purchase order status
    const mockStatus = {
      id: id,
      status: DocumentStatus.ANALYZED, // Using the real status enum
    };

    // Log the mock request
    console.log(`[SANDBOX] Mock get purchase order status for ID: ${id}`);

    return res.status(200).json(mockStatus);
  } catch (error) {
    console.error("[SANDBOX] Error in mock get purchase order status:", error);
    return res.status(500).json({
      message: "Error in sandbox purchase order status retrieval",
      error: error.message,
    });
  }
};

/**
 * Mock get purchase order by ID
 */
const mockGetPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Static partner ID for sandbox testing - use a valid UUID
    const partnerId = "123e4567-e89b-12d3-a456-426614174001";
      // Use the real purchase order mapper to create a mock purchase order response
    const purchaseOrderMapper = new AzurePurchaseOrderMapper();
    const mappedData = purchaseOrderMapper.mapToPurchaseOrderModel(samplePurchaseOrderData, partnerId);
    
    // Create the response formatter
    const responseFormatter = new PurchaseOrderResponseFormatter();
    
    // Format the purchase order data using the formatter
    const formattedResponse = responseFormatter.formatPurchaseOrderResponse(
      {
        po_number: id,
        due_date: mappedData.purchaseOrderData.due_date,
        payment_terms: mappedData.purchaseOrderData.payment_terms,
        currency_code: mappedData.purchaseOrderData.currency_code,
        total_amount: mappedData.purchaseOrderData.total_amount,
        subtotal_amount: mappedData.purchaseOrderData.subtotal_amount,
        discount_amount: mappedData.purchaseOrderData.discount_amount,
        tax_amount: mappedData.purchaseOrderData.tax_amount
      },
      mappedData.itemsData.map(item => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice
      })),
      {
        uuid: "1aca895c-0b1f-4536-a482-733398a84a9a",
        name: mappedData.customerData.name,
        recipient_name: mappedData.customerData.contact_name,
        address: mappedData.customerData.address,
        tax_id: mappedData.customerData.tax_id
      },
      {
        name: mappedData.vendorData.name,
        address: mappedData.vendorData.address,
        recipient_name: mappedData.vendorData.contact_name,
        tax_id: mappedData.vendorData.tax_id
      }
    );
    
    // Add document URL to the response
    const response = {
      ...formattedResponse,
      data: {
        ...formattedResponse.data,
        documentUrl: "https://mock-s3-url.com/purchase-order.pdf"
      }
    }
    // Log the mock request
    console.log(`[SANDBOX] Mock get purchase order details for ID: ${id}`);

    return res.status(200).json(response);
  } catch (error) {
    console.error("[SANDBOX] Error in mock get purchase order details:", error);
    return res.status(500).json({
      message: "Error in sandbox purchase order details retrieval",
      error: error.message,
    });
  }
};

/**
 * Mock delete purchase order by ID
 */
const mockDeletePurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Log the mock request
    console.log(`[SANDBOX] Mock delete purchase order for ID: ${id}`);

    // Return a success response
    return res.status(200).json({
      message: "Purchase order successfully deleted",
      id: id
    });
  } catch (error) {
    console.error("[SANDBOX] Error in mock delete purchase order:", error);
    return res.status(500).json({
      message: "Error in sandbox purchase order deletion",
      error: error.message,
    });
  }
};

module.exports = {
  mockUploadPurchaseOrder,
  mockGetPurchaseOrderStatus,
  mockGetPurchaseOrderById,
  mockDeletePurchaseOrderById
};
