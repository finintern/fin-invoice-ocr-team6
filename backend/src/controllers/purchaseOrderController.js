const purchaseOrderService = require("../services/purchaseOrder/purchaseOrderService");
const FinancialDocumentController = require('./financialDocumentController');


class PurchaseOrderController extends FinancialDocumentController {
  constructor(purchaseOrderService) {
    if (!purchaseOrderService || typeof purchaseOrderService.uploadPurchaseOrder !== 'function') {  
      throw new Error('Invalid purchase order service provided');  
    }  
    super(purchaseOrderService, "Purchase Order");
    this.uploadPurchaseOrder = this.uploadPurchaseOrder.bind(this);
  }

  async uploadPurchaseOrder(req, res) {
    return this.uploadFile(req, res);
  }

  async processUpload(req) {
    const { buffer, originalname, mimetype } = req.file;
    const partnerId = req.user.uuid;

    return await this.service.uploadPurchaseOrder({
      buffer,
      originalname,
      mimetype,
      partnerId
    })
  }
}

const purchaseOrderController = new PurchaseOrderController();

exports.uploadPurchaseOrder = async(req,res) => {
    return purchaseOrderController.uploadFile(req,res);
}

/**
 * Analyzes a purchase order document using Azure Form Recognizer and optionally saves to database
 */
exports.analyzePurchaseOrder = async (req, res) => {
  const { documentUrl } = req.body;
  const partnerId = req.user?.uuid; 
  
  if (!documentUrl) {
    return res.status(400).json({ message: "documentUrl is required" });
  }
  
  if (!partnerId) {
    return res.status(401).json({ message: "Unauthorized. User information not available." });
  }

  try {
    // Analyze document, map data, and save to database
    const result = await PurchaseOrderService.analyzePurchaseOrder(documentUrl, partnerId);
    
    if (!result?.savedPurchaseOrder) {
      return res.status(500).json({ message: "Failed to analyze purchase order: no saved purchase order returned" });
    }
    
    return res.status(200).json({
      message: "Purchase order analyzed and saved to database",
      rawData: result.rawData,
      purchaseOrderData: result.purchaseOrderData,
      savedPurchaseOrder: result.savedPurchaseOrder
    });
  } catch (error) {
    if (error.message.includes("Invalid date format") || error.message === "Purchase order contains invalid date format") {
      return res.status(400).json({ message: error.message });
    } else if (error.message === "Failed to process the document") {
      return res.status(400).json({ message: error.message });
    } else {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

exports.getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Purchase Order ID is required" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const poPartnerId = await PurchaseOrderService.getPartnerId(id);

    if (poPartnerId !== req.user.uuid) {
      return res.status(403).json({ message: "Forbidden: You do not have access to this purchase order" });
    }

    const poDetail = await PurchaseOrderService.getPurchaseOrderById(id);

    return res.status(200).json(poDetail);
  } catch (error) {
    if (error.message === "Purchase order not found") {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};
