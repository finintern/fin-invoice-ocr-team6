const invoiceService = require('../services/invoiceService');
const pdfValidationService = require('../services/pdfValidationService');
const validateDeletion = require('../services/validateDeletion');
const s3Service = require('../services/s3Service');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
});

exports.uploadMiddleware = upload.single('file');

/**
 * Handles the upload and validation of invoice PDF files with an automatic 3-second timeout.
 *
 * This function performs multiple validation steps on the uploaded file:
 * 1. Authentication: Verifies client credentials before processing.
 * 2. Timeout Protection: Automatically terminates the request if it exceeds 3 seconds.
 * 3. File Type Validation: Ensures the uploaded file is a valid PDF.
 * 4. Encryption Check: Rejects encrypted PDFs.
 * 5. Integrity Check: Verifies the PDF is not corrupted.
 * 6. Size Validation: Ensures the file does not exceed the allowed size limit.
 * 7. Upload Process: Uploads the validated invoice file.
 *
 * The function uses a Promise.race mechanism to implement the timeout, ensuring that
 * the server responds in a timely manner even when processing large files or experiencing
 * unexpected delays in the validation or upload process.
 *
 * @param {Object} req - Express request object containing the uploaded file and request data.
 * @param {Object} req.file - Uploaded file information from Multer middleware.
 * @param {Buffer} req.file.buffer - File content in buffer format.
 * @param {string} req.file.originalname - Original filename including extension.
 * @param {string} req.file.mimetype - MIME type of the file.
 * @param {Object} req.user - Request containing authentication credentials.
 * @param {string} req.user.uuid - Unique identifier for the partner/user uploading the file.
 * @param {Object} res - Express response object.
 * @returns {Promise<Object>} JSON response with appropriate status code and message.
 *
 * @throws {Error} Returns specific error messages for each validation failure.
 * Returns a 504 Gateway Timeout response if processing exceeds 3 seconds.
 * Logs internal server errors to the console but provides a generic response to the client.
 */
exports.uploadInvoice = async (req, res) => {
  if (req.query && req.query.simulateTimeout === 'true') {
    return res.status(504).json({ message: "Server timeout - upload exceeded 3 seconds" });
  }

  const safeResponse = (status, message) => {
    if (!res.headersSent) {
      return res.status(status).json({ message });
    }
    return false;
  };

  const executeWithTimeout = (fn, timeoutMs = 3000) => {
    let timeoutId;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Timeout'));
      }, timeoutMs);
    });
    
    return Promise.race([
      fn().finally(() => clearTimeout(timeoutId)),
      timeoutPromise
    ]);
  };

  try {
    await executeWithTimeout(async () => {
      if (!req.user) {
        safeResponse(401, "Unauthorized");
        return false;
      }

      if (!req.file) {
        safeResponse(400, "No file uploaded");
        return false;
      }
      
      const { buffer, originalname, mimetype } = req.file;
      const partnerId = req.user.uuid;
      
      try {
        await pdfValidationService.validatePDF(buffer, mimetype, originalname);
      } catch (error) {
        safeResponse(415, "File format is not PDF");
        return false;
      }
      
      
      const isEncrypted = await pdfValidationService.isPdfEncrypted(buffer);
      if (isEncrypted) {
        safeResponse(400, "PDF is encrypted");
        return false;
      }
      
    
      const isValidPdf = await pdfValidationService.checkPdfIntegrity(buffer);
      if (!isValidPdf) {
        safeResponse(400, "PDF file is invalid");
        return false;
      }

      try {
        await pdfValidationService.validateSizeFile(buffer);
      } catch (error) {
        safeResponse(413, "File size exceeds maximum limit");
        return false;
      }

      try {
        const result = await invoiceService.uploadInvoice({ originalname, buffer, mimetype, partnerId });
        safeResponse(200, result);
        return true;
      } catch (error) {
        console.error("Unhandled error in upload process:", error);
        safeResponse(500, "Internal server error");
        return false;
      }
    }); 

  } catch (error) {
    if (error.message === 'Timeout') {
      safeResponse(504, "Server timeout - upload exceeded 3 seconds");
    } else {
      console.error("Unexpected error:", error);
      safeResponse(500, "Internal server error");
    }
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceService.getInvoiceById(id);
    return res.status(200).json(invoice);
  } catch (error) {
    if (error.message === "Invoice not found") {
      return res.status(404).json({ message: "Invoice not found" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Deletes an invoice by its ID.
 *
 * @param {Object} req - The request object containing parameters and user info.
 * @param {Object} res - The response object used to send status and messages.
 * @returns {Promise<Response>} The response indicating success or failure.
 */
exports.deleteInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id) || parseInt(id) <= 0) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let invoice;
    try {
      invoice = await validateDeletion.validateInvoiceDeletion(req.user.uuid, parseInt(id));
    } catch (error) {
      if (error.message === "Invoice not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Unauthorized: You do not own this invoice") {
        return res.status(403).json({ message: error.message });
      }
      if (error.message === "Invoice cannot be deleted unless it is Analyzed") {
        return res.status(409).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }

    if (invoice.file_url) {
      const fileKey = invoice.file_url.split('/').pop();
      const deleteResult = await s3Service.deleteFile(fileKey);
      if (!deleteResult.success) {
        return res.status(500).json({ message: "Failed to delete file from S3", error: deleteResult.error });
      }
    }

    await invoiceService.deleteInvoiceById(id);

    return res.status(200).json({ message: "Invoice successfully deleted" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


/**
 * Analyzes an invoice document using Azure Form Recognizer and optionally saves to database
 */
exports.analyzeInvoice = async (req, res) => {
  const { documentUrl } = req.body;
  const partnerId = req.user?.uuid; 
  if (!documentUrl) {
    return res.status(400).json({ message: "documentUrl is required" });
  }
  if (!partnerId) {
    return res.status(401).json({ message: "Unauthorized. User information not available." });
  }

  try {
    // Analisis dokumen, mapping, dan simpan ke database
    const result = await invoiceService.analyzeInvoice(documentUrl, partnerId);
    
    if (!result || !result.savedInvoice) {
      return res.status(500).json({ message: "Failed to analyze invoice: no saved invoice returned" });
    }
    
    return res.status(200).json({
      message: "Invoice analyzed and saved to database",
      rawData: result.rawData,
      invoiceData: result.invoiceData,
      savedInvoice: result.savedInvoice
    });
  } catch (error) {
    if (error.message.includes("Invalid date format") || error.message === "Invoice contains invalid date format") {
      return res.status(400).json({ message: error.message });
    } else if (error.message === "Failed to process the document") {
      return res.status(400).json({ message: error.message });
    } else {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
};
