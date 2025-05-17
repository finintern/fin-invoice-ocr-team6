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
      const { buffer, originalname, mimetype } = req.file;
    
    // Static mock purchase order ID for sandbox testing
    const purchaseOrderId = "sandbox-po-789012";
    
    // Static partner ID for sandbox testing
    const partnerId = "sandbox-partner-123456";
    
    // Generate mock S3 URL for the uploaded file
    const _mockS3Url = `https://mock-s3-bucket.s3.amazonaws.com/${purchaseOrderId}.pdf`;
    
    // Generate mock S3 URL for the analysis JSON
    const _mockAnalysisUrl = `https://mock-s3-bucket.s3.amazonaws.com/analysis/${purchaseOrderId}-analysis.json`;

    // Use the real purchase order mapper to map the sample data
    const purchaseOrderMapper = new AzurePurchaseOrderMapper();
    const mappedData = purchaseOrderMapper.mapToPurchaseOrderModel(samplePurchaseOrderData.data, partnerId);

    // Log the mock upload
    console.log(`[SANDBOX] Mock purchase order upload processed: ${originalname}, size: ${buffer.length} bytes`);

    // Construct response similar to the real API
    return res.status(200).json(mappedData);
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
      created_at: "2023-01-15T08:30:00.000Z", // Static timestamp
      updated_at: "2023-01-15T08:30:00.000Z"  // Static timestamp
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
    
    // Static partner ID for sandbox testing
    const partnerId = "sandbox-partner-123456";
      // Use the real purchase order mapper to create a mock purchase order response
    const purchaseOrderMapper = new AzurePurchaseOrderMapper();
    const mappedData = purchaseOrderMapper.mapToPurchaseOrderModel(samplePurchaseOrderData.data, partnerId);
    
    // Override the ID to match the requested ID
    mappedData.id = id;
    mappedData.created_at = "2023-01-15T08:30:00.000Z"; // Static timestamp
    mappedData.updated_at = "2023-01-15T08:30:00.000Z"; // Static timestamp
    
    // Generate mock S3 URLs
    mappedData.file_url = `https://mock-s3-bucket.s3.amazonaws.com/${id}.pdf`;
    mappedData.analysis_url = `https://mock-s3-bucket.s3.amazonaws.com/analysis/${id}-analysis.json`;

    // Log the mock request
    console.log(`[SANDBOX] Mock get purchase order details for ID: ${id}`);

    return res.status(200).json(mappedData);
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
