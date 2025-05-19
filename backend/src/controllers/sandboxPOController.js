const fs = require('fs');
const path = require('path');
const DocumentStatus = require('../models/enums/DocumentStatus');
const { AzurePurchaseOrderMapper } = require('../services/purchaseOrderMapperService/purchaseOrderMapperService');

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

    // Format date strings to ISO strings to match expected format
    const purchaseOrderDate = new Date(mappedData.data.purchaseOrderDate);
    const dueDate = new Date(mappedData.data.due_date);

    const response = {
      data: {
        documents: [
          {
            header: {
              purchase_order_details: {
                purchase_order_id: purchaseOrderDate.toISOString(),
                due_date: dueDate.toISOString(),
                payment_terms: mappedData.purchaseOrderData.payment_terms
              },
              vendor_details: {
                name: mappedData.vendorData.name,
                address: mappedData.vendorData.address,
                contact_name: mappedData.vendorData.contact_name,
                tax_id: mappedData.vendorData.tax_id
              },
              customer_details: {
                id: "1aca895c-0b1f-4536-a482-733398a84a9a",
                name: mappedData.customerData.name,
                contact_name: mappedData.customerData.contact_name,
                address: mappedData.customerData.address,
                tax_id: mappedData.customerData.tax_id
              },
              financial_details: {
                currency: {
                  currency_symbol: mappedData.purchaseOrderData.currency_symbol,
                  currency_code: mappedData.purchaseOrderData.currency_code
                },
                total_amount: mappedData.purchaseOrderData.total_amount.toString(),
                subtotal_amount: mappedData.purchaseOrderData.subtotal_amount.toString(),
                discount_amount: mappedData.purchaseOrderData.discount_amount,
                total_tax_amount: mappedData.purchaseOrderData.tax_amount.toString(),
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
        documentUrl: "https://mock-s3-url.com/purchase-order.pdf",
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

module.exports = {
  mockUploadPurchaseOrder,
  mockGetPurchaseOrderStatus,
  mockGetPurchaseOrderById
};
