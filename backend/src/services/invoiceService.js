const { Invoice } = require("../models");
const s3Service = require("./s3Service");
const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");
const { AzureInvoiceMapper } = require("./invoiceMapperService");
const dotenv = require("dotenv");
const { Customer } = require("../models");
const { Vendor } = require("../models");
const Sentry = require("../instrument");
dotenv.config();

const endpoint = process.env.AZURE_ENDPOINT;
const key = process.env.AZURE_KEY;
const modelId = process.env.AZURE_INVOICE_MODEL;

class InvoiceService {
  constructor() {
    this.azureMapper = new AzureInvoiceMapper();
  }
  /**
   * Uploads and processes an invoice file
   * 
   * This method handles the complete invoice processing workflow:
   * 1. Validates the file data and partner ID
   * 2. Uploads the file to S3 storage
   * 3. Analyzes the invoice using Azure's document intelligence
   * 4. Maps the analysis results to our invoice data model
   * 5. Saves the invoice data to the database
   *
   * @param {Object} fileData - Object containing invoice file data
   * @param {Buffer} fileData.buffer - The raw file content
   * @param {string} fileData.originalname - The original filename
   * @param {string} fileData.partnerId - The partner/customer ID associated with this invoice
   * @returns {Promise<Object>} Object containing success message, invoice ID and basic invoice details
   * @throws {Error} If file validation fails, S3 upload fails, analysis fails, or database operations fail
   */
  async uploadInvoice(fileData) {
    return this._withSentryTracing('uploadInvoice', fileData, async () => {
      let invoice;
      try {
        invoice = await this._processInvoiceUpload(fileData);
        this._captureSuccess('Invoice upload completed', { invoiceId: invoice.id });
        return this.buildResponse(invoice);
      } catch (error) {
        await this._handleUploadError(error, invoice);
        throw error;
      }
    });
  }

  async _processInvoiceUpload(fileData) {
    let invoice;
    try {
      this._addBreadcrumb('Starting invoice upload process');
      this.validateFileData(fileData);
  
      const { buffer, originalname, partnerId } = fileData;
      
      this._addBreadcrumb('Uploading file to S3');
      const s3Url = await this.uploadToS3(buffer);
  
      this._addBreadcrumb('Creating initial invoice record');
      invoice = await this.createInvoiceRecord(partnerId, s3Url);
  
      this._addBreadcrumb('Analyzing invoice');
      const analysisResult = await this.analyzeInvoice(buffer);
  
      this._addBreadcrumb('Processing analysis results');
      const { invoiceData2, customerData, vendorData } = 
        this.mapAnalysisResult(analysisResult, partnerId, originalname, buffer.length);
  
      // Validate mapped data
      if (!invoiceData2 || Object.keys(invoiceData2).length === 0) {
        throw new Error('Invalid OCR result format');
      }
  
      this._addBreadcrumb('Updating records');
      await this.updateInvoiceRecord(invoice.id, invoiceData2);
      await this.updateCustomerAndVendorData(invoice.id, customerData, vendorData);
  
      return invoice;
    } catch (error) {
      if (invoice?.id) {
        await Invoice.update({ status: 'Failed' }, { where: { id: invoice.id } });
      }
      throw error;
    }
  }

  _withSentryTracing(operation, data, callback) {
    return Sentry.startSpan(
      {
        name: operation,
        attributes: {
          originalname: data?.originalname,
          partnerId: data?.partnerId,
        },
      },
      callback
    );
  }

  _addBreadcrumb(message, level = 'info') {
    Sentry.addBreadcrumb({
      category: 'uploadInvoice',
      message,
      level,
    });
  }

  _captureSuccess(message, extra = {}) {
    Sentry.captureMessage(message, {
      level: 'info',
      extra,
    });
  }

  async _handleUploadError(error, invoice) {
    this._addBreadcrumb(`Error encountered: ${error.message}`, 'error');

    if (invoice?.id) {
      this._addBreadcrumb(`Updating invoice status to Failed for ID: ${invoice.id}`, 'warning');
      await Invoice.update({ status: "Failed" }, { where: { id: invoice.id } });
    }

    Sentry.captureException(error, {
      extra: {
        invoiceId: invoice?.id,
      },
    });

    console.error("Error processing invoice:", error);
  }

  validateFileData(fileData) {
    if (!fileData) {
      throw new Error("File not found");
    }
    const { partnerId } = fileData;
    if (!partnerId) {
      throw new Error("Partner ID is required");
    }
  }

  async uploadToS3(buffer) {
    const s3Url = await s3Service.uploadFile(buffer);
    if (!s3Url) {
      throw new Error("Failed to upload file to S3");
    }
    return s3Url;
  }

  async createInvoiceRecord(partnerId, s3Url) {
    const invoiceData = {
      status: "Processing",
      partner_id: partnerId,
      file_url: s3Url,
    };
    return await Invoice.create(invoiceData);
  }

  mapAnalysisResult(analysisResult, partnerId, originalname, fileSize) {
    if (!analysisResult?.data) {
      throw new Error("Failed to analyze invoice: No data returned");
    }
    const { invoiceData: invoiceData2, customerData, vendorData } = this.azureMapper.mapToInvoiceModel(analysisResult.data, partnerId);
    invoiceData2.original_filename = originalname;
    invoiceData2.file_size = fileSize;
    return { invoiceData2, customerData, vendorData };
  }

  async updateInvoiceRecord(invoiceId, invoiceData2) {
    await Invoice.update(invoiceData2, { where: { id: invoiceId } });
    await Invoice.update({ status: "Analyzed" }, { where: { id: invoiceId } });
  }

  async updateCustomerAndVendorData(invoiceId, customerData, vendorData) {
    if (customerData?.name) {
      let customer = await Customer.findOne({
        where: {
          name: customerData.name,
          ...(customerData.tax_id && { tax_id: customerData.tax_id }),
          ...(customerData.postal_code && { postal_code: customerData.postal_code }),
          ...(customerData.street_address && { street_address: customerData.street_address })
        }
      });
      if (!customer) {
        customer = await Customer.create(customerData);
      }
      await Invoice.update({ customer_id: customer.uuid }, { where: { id: invoiceId } });
    }
    if (vendorData?.name) {
      let vendor = await Vendor.findOne({
        where: {
          name: vendorData.name,
          ...(vendorData.tax_id && { tax_id: vendorData.tax_id }),
          ...(vendorData.postal_code && { postal_code: vendorData.postal_code }),
          ...(vendorData.street_address && { street_address: vendorData.street_address })
        }
      });
      if (!vendor) {
        vendor = await Vendor.create(vendorData);
      }
      await Invoice.update({ vendor_id: vendor.uuid }, { where: { id: invoiceId } });
    }
  }

  buildResponse(invoice) {
    return {
      message: "Invoice successfully processed and saved",
      invoiceId: invoice.id,
      details: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
        status: invoice.status,
        created_at: invoice.created_at
      }
    };
  }

  async getInvoiceById(id) {
    try {
      const invoice = await Invoice.findByPk(id);
      
      if (!invoice) {
        throw new Error("Invoice not found");
      }
      
      const invoiceData = invoice.get({ plain: true });
      
      if (invoiceData.customer_id) {
        const customer = await Customer.findByPk(invoiceData.customer_id);
        if (customer) {
          invoiceData.customer = customer.get({ plain: true });
        }
      }
      
      if (invoiceData.vendor_id) {
        const vendor = await Vendor.findByPk(invoiceData.vendor_id);
        if (vendor) {
          invoiceData.vendor = vendor.get({ plain: true });
        }
      }
      
      return invoiceData;
      
    } catch (error) {
      console.error("Error retrieving invoice:", error);
      if (error.message === "Invoice not found") {
        throw error;
      } else {
        throw new Error("Failed to retrieve invoice: " + error.message);
      }
    }
  }
  
  async analyzeInvoice(documentUrl) {
    if (!documentUrl) {
      throw new Error("documentUrl is required");
    }

    return Sentry.startSpan(
      {
        name: "analyzeInvoice",
        attributes: {
          documentUrl: typeof documentUrl === "string" ? documentUrl : "Buffer data",
        },
      },
      async (span) => {
        try {
          Sentry.captureMessage(`analyzeInvoice() called with documentUrl: ${typeof documentUrl === 'string' ? documentUrl : 'Buffer data'}`);

          Sentry.addBreadcrumb({
            category: "analyzeInvoice",
            message: `Starting document analysis for: ${typeof documentUrl === "string" ? documentUrl : "Binary Buffer"}`,
            level: "info",
          });

          console.log("Processing PDF...");
          const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
          let poller;

          if (typeof documentUrl === 'string') {
            poller = await client.beginAnalyzeDocument(modelId, documentUrl);
          } else if (Buffer.isBuffer(documentUrl)) {
            poller = await client.beginAnalyzeDocument(modelId, documentUrl);
          } else {
            throw new Error("Invalid document source type");
          }

          Sentry.addBreadcrumb({
            category: "analyzeInvoice",
            message: "Azure analysis started...",
            level: "info",
          });

          const azureResult = await poller.pollUntilDone();
          console.log("Analysis completed");

          Sentry.addBreadcrumb({
            category: "analyzeInvoice",
            message: "Azure analysis completed successfully",
            level: "info",
          });

          Sentry.captureMessage("analyzeInvoice() completed successfully");

          return {
            message: "PDF processed successfully",
            data: azureResult,
          };
        } catch (error) {
          Sentry.addBreadcrumb({
            category: "analyzeInvoice",
            message: `Error encountered: ${error.message}`,
            level: "error",
          });

          Sentry.captureException(error);
          if (error.message === 'Invalid date format') {
            throw new Error("Invoice contains invalid date format");
          }
          if (error.message === 'Invalid document source type') {
            throw error;
          }
          if (error.statusCode === 503) {
            console.error("Service Unavailable:", error);
            throw new Error("Service is temporarily unavailable. Please try again later.");
          } else if (error.statusCode === 409) {
            console.error("Conflict Error:", error);
            throw new Error("Conflict error occurred. Please check the document and try again.");
          } else {
            console.error(error);
            throw new Error("Failed to process the document");
          }
        } finally {
          span.end(); // Ensure transaction is always finished
        }
      }
    );
  }
}

module.exports = new InvoiceService();