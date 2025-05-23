const { v4: uuidv4 } = require('uuid');
const { from, of, forkJoin, throwError } = require('rxjs');
const { catchError, map, switchMap } = require('rxjs/operators');
const FinancialDocumentService = require("../financialDocumentService.js");
const Sentry = require("../../instrument.js");
const InvoiceRepository = require('../../repositories/invoiceRepository.js');
const CustomerRepository = require('../../repositories/customerRepository.js');
const VendorRepository = require('../../repositories/vendorRepository.js');
const ItemRepository = require('../../repositories/itemRepository.js');
const { OcrAnalyzerFactory } = require('../analysis');
const InvoiceValidator = require('./invoiceValidator.js');
const InvoiceResponseFormatter = require('./invoiceResponseFormatter.js');
const { AzureInvoiceMapper } = require('../invoiceMapperService/invoiceMapperService.js');
const DocumentStatus = require('../../models/enums/DocumentStatus.js');
const { NotFoundError } = require('../../utils/errors.js');
const fs = require('fs').promises;
const path = require('path');
const InvoiceLogger = require('./invoiceLogger.js'); 



class InvoiceService extends FinancialDocumentService {
  constructor(dependencies = {}) {
    // Panggil konstruktor parent dengan type dokumen dan s3Service
    super("Invoice", dependencies.s3Service);

    // Inisialisasi repositories
    this.invoiceRepository = dependencies.invoiceRepository || new InvoiceRepository();
    this.customerRepository = dependencies.customerRepository || new CustomerRepository();
    this.vendorRepository = dependencies.vendorRepository || new VendorRepository();
    this.itemRepository = dependencies.itemRepository || new ItemRepository();

    // Inisialisasi services
    this.ocrType = dependencies.ocrType || process.env.OCR_ANALYZER_TYPE || 'azure';
    this.ocrConfig = dependencies.ocrConfig || {};
    this.documentAnalyzer = dependencies.documentAnalyzer || 
                            OcrAnalyzerFactory.createAnalyzer(this.ocrType, this.ocrConfig);
    this.validator = dependencies.validator || new InvoiceValidator();
    this.responseFormatter = dependencies.responseFormatter || new InvoiceResponseFormatter();
    this.azureMapper = dependencies.azureMapper || new AzureInvoiceMapper();

    // Logger menggunakan nilai default jika tidak ada
    this.logger = dependencies.logger || this.logger;
  }

  async uploadInvoice(fileData, skipAnalysis = false) {
    try {
      this.validator.validateFileData(fileData);
      const { buffer, originalname, partnerId } = fileData;

      const invoiceUuid = uuidv4();
      this.logger.logUploadStart(invoiceUuid, partnerId, originalname);

      let s3Result;
      try {
        s3Result = await this.uploadFile(fileData);
        this.logger.logUploadSuccess(invoiceUuid, s3Result.file_url);
      } catch (error) {
        this.logger.logError(invoiceUuid, error, 'S3_UPLOAD');
        throw new Error("Failed to upload file to S3");
      }

      await this.invoiceRepository.createInitial({
        id: invoiceUuid,
        status: DocumentStatus.PROCESSING,
        partner_id: partnerId,
        file_url: s3Result.file_url,
        original_filename: originalname,
        file_size: buffer.length,
      });

      this.processInvoiceAsync(invoiceUuid, buffer, partnerId, originalname, invoiceUuid, skipAnalysis);

      return {
        message: "Invoice upload initiated",
        id: invoiceUuid,
        status: DocumentStatus.PROCESSING
      };
    } catch (error) {
      this.logger.logError(null, error, 'UPLOAD_INITIATION');
      throw new Error(`Failed to process invoice: ${error.message}`);
    }
  }

  /**
     * Process invoice asynchronously in background
     * @private
     */
  async processInvoiceAsync(invoiceId, buffer, partnerId, originalname, uuid, skipAnalysis = false) {
    try {
      this.logger.logProcessingStart(invoiceId);
      Sentry.addBreadcrumb({
        category: "invoiceProcessing",
        message: `Starting async processing for invoice ${uuid}`,
        level: "info"
      });

      let analysisResult;

      if (skipAnalysis) {
        // Use sample data instead of analyzing with Azure
        analysisResult = await this.loadSampleData();
        this.logger.logAnalysisComplete(invoiceId, "Using sample data");
      } else {
        // 1. Analisis invoice menggunakan Azure
        analysisResult = await this.analyzeInvoice(buffer);
      }

      // 2. Upload hasil OCR ke S3 sebagai JSON dan dapatkan URL-nya
      const jsonUrl = await this.uploadAnalysisResults(analysisResult, invoiceId);
      if (!skipAnalysis) {
        this.logger.logAnalysisComplete(invoiceId, jsonUrl);
      }

      // 3. Map hasil analisis ke model data
      const { invoiceData, customerData, vendorData, itemsData } =
        this.mapAnalysisResult(analysisResult, partnerId, originalname, buffer.length);

      this.logger.logDataMappingComplete(invoiceId, {
        hasCustomerData: !!customerData,
        hasVendorData: !!vendorData,
        itemsCount: itemsData?.length
      });

      // 4. Update record invoice dengan data hasil analisis dan URL JSON
      await this.updateInvoiceRecord(invoiceId, {
        ...invoiceData,
        analysis_json_url: jsonUrl
      });

      // 5. Update data customer dan vendor
      await this.updateCustomerAndVendorData(invoiceId, customerData, vendorData);

      // 6. Simpan item invoice
      await this.saveInvoiceItems(invoiceId, itemsData);

      // 7. Update status menjadi "Analyzed"
      await this.invoiceRepository.update(invoiceId, { status: DocumentStatus.ANALYZED });

      this.logger.logProcessingComplete(invoiceId);
      Sentry.captureMessage(`Successfully completed processing invoice ${uuid}`);
    } catch (error) {
      this.logger.logError(invoiceId, error, 'PROCESSING');
      Sentry.captureException(error);

      // Update status menjadi "Failed" jika processing gagal
      await this.invoiceRepository.updateStatus(invoiceId, DocumentStatus.FAILED);
    }
  }

  async loadSampleData() {
    try {
      const filePath = path.resolve(__dirname, '../analysis/sample-invoice.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      return { data: JSON.parse(fileContent) };
    } catch (error) {
      console.error('Error loading sample data:', error);
      throw new Error(`Failed to load sample data: ${error.message}`);
    }
  }

  mapAnalysisResult(analysisResult, partnerId, originalname, fileSize) {
    const { invoiceData, customerData, vendorData, itemsData } =
      this.azureMapper.mapToInvoiceModel(analysisResult.data, partnerId);

    invoiceData.original_filename = originalname;
    invoiceData.file_size = fileSize;

    console.log("Invoice data mapped:", JSON.stringify(invoiceData, null, 2));

    return { invoiceData, customerData, vendorData, itemsData };
  }

  async updateInvoiceRecord(invoiceId, invoiceData) {
    try {
      if (!invoiceData) {
        console.error("Invoice data is undefined!");
        return;
      }

      await this.invoiceRepository.update(invoiceId, invoiceData);
      console.log(`Invoice data updated for ${invoiceId}`);
    } catch (error) {
      console.error("Error updating invoice:", error);
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  }

  async updateCustomerAndVendorData(invoiceId, customerData, vendorData) {
    if (customerData?.name) {
      let customer = await this.customerRepository.findByAttributes({
        name: customerData.name,
        ...(customerData.tax_id && { tax_id: customerData.tax_id }),
        ...(customerData.address && { address: customerData.address })
      });

      if (!customer) {
        customer = await this.customerRepository.create(customerData);
      }

      await this.invoiceRepository.updateCustomerId(invoiceId, customer.uuid);
    }

    if (vendorData?.name) {
      let vendor = await this.vendorRepository.findByAttributes({
        name: vendorData.name,
        ...(vendorData.tax_id && { tax_id: vendorData.tax_id }),
        ...(vendorData.address && { address: vendorData.address })
      });

      if (!vendor) {
        vendor = await this.vendorRepository.create(vendorData);
      }

      await this.invoiceRepository.updateVendorId(invoiceId, vendor.uuid);
    }
  }

  async saveInvoiceItems(invoiceId, itemsData) {
    console.log("Saving invoice items...", itemsData);
    if (!itemsData || !Array.isArray(itemsData) || itemsData.length === 0) {
      console.log("No items to save");
      return;
    }

    try {
      for (const itemData of itemsData) {
        await this.itemRepository.createDocumentItem(
          'Invoice',
          invoiceId,
          {
            description: itemData.description || null,
            quantity: itemData.quantity || 0,
            unit: itemData.unit || null,
            unit_price: itemData.unitPrice || 0,
            amount: itemData.amount || 0
          }
        );
      }

      console.log(`Saved ${itemsData.length} items for invoice ${invoiceId}`);
    } catch (error) {
      console.error('Error saving invoice items:', error);
      throw new Error(`Failed to save invoice items: ${error.message}`);
    }
  }

  async getPartnerId(invoiceId) {
    const invoice = await this.invoiceRepository.findById(invoiceId);

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }
    return invoice.partner_id;
  }

  getInvoiceById(invoiceId) {
    InvoiceLogger.logRetrievalStart(invoiceId);
    
    return from(this.invoiceRepository.findById(invoiceId)).pipe(
      switchMap(invoice => {
        if (!invoice) {
          const error = new NotFoundError("Invoice not found");
          InvoiceLogger.logRetrievalError(invoiceId, error, 'NOT_FOUND');
          return throwError(() => error);
        }

        if (invoice.status === DocumentStatus.PROCESSING) {
          InvoiceLogger.logRetrievalProcessing(invoiceId);
          return of(this.responseFormatter.formatStatusResponse(invoice, DocumentStatus.PROCESSING));
        }

        if (invoice.status === DocumentStatus.FAILED) {
          InvoiceLogger.logRetrievalFailed(invoiceId);
          return of(this.responseFormatter.formatStatusResponse(invoice, DocumentStatus.FAILED));
        }

        const items$ = from(this.itemRepository.findItemsByDocumentId(invoiceId, 'Invoice'));
        const customer$ = invoice.customer_id
          ? from(this.customerRepository.findById(invoice.customer_id))
          : of(null);
        const vendor$ = invoice.vendor_id
          ? from(this.vendorRepository.findById(invoice.vendor_id))
          : of(null);

        return forkJoin({ items: items$, customer: customer$, vendor: vendor$ }).pipe(
          map(({ items, customer, vendor }) => {
            const summary = {
              hasItems: items && items.length > 0,
              hasCustomer: !!customer,
              hasVendor: !!vendor,
              status: invoice.status
            };
            
            InvoiceLogger.logRetrievalSuccess(invoiceId, summary);
            return this.responseFormatter.formatInvoiceResponse(invoice, items, customer, vendor);
          })
        );
      }),
      catchError(error => {
        InvoiceLogger.logRetrievalError(invoiceId, error, 'DATABASE_ERROR');
        return throwError(() =>
          error.message === "Invoice not found"
            ? error
            : new Error("Failed to retrieve invoice: " + error.message)
        );
      })
    );
  }

  deleteInvoiceById(id) {
    return from(Promise.resolve())
      .pipe(
        switchMap(() => from(this.invoiceRepository.delete(id))),
        map(result => {
          if (result === 0) {
            const err = new Error(`Failed to delete invoice with ID: ${id}`);
            InvoiceLogger.logDeletionError(id, err, 'DELETE_DB');
            Sentry.captureException(err);
            throw err;
          }
          InvoiceLogger.logDatabaseDeletionSuccess(id);
          return { message: 'Invoice successfully deleted' };
        }),
        catchError(error => {
          InvoiceLogger.logDeletionError(id, error, 'DELETE_DB');
          Sentry.captureException(error);
          throw new Error('Failed to delete invoice: ' + error.message);
        })
      );
  }
  
    
  getInvoiceStatus(invoiceId) {
    return from(this.invoiceRepository.findById(invoiceId)).pipe(
      switchMap((invoice) => {
        if (!invoice) {
          this.logger.logStatusNotFound?.(invoiceId);
          return throwError(() => new NotFoundError("Invoice not found"));
        }

        this.logger.logStatusRequest?.(invoiceId, invoice.status);

        return of({
          id: invoice.id,
          status: invoice.status
        });
      }),
      catchError((error) => {
        if (error instanceof NotFoundError) {
          return throwError(() => error);
        }

        this.logger.logStatusError?.(invoiceId, error);
        Sentry.captureException(error);
        console.error("Error getting invoice status:", error);
        return throwError(() => new Error(`Failed to get invoice status: ${error.message}`));
      })
    );
  }

  async analyzeInvoice(documentUrl) {
    return this.documentAnalyzer.analyzeDocument(documentUrl);
  }
}

/**
 * Factory function untuk membuat instance InvoiceService yang dikonfigurasi dengan benar
 * @param {Object} customDependencies - Custom dependencies untuk mengganti default
 * @returns {InvoiceService} Instance InvoiceService yang dikonfigurasi
 */
function createInvoiceService(customDependencies = {}) {
  // Import default dependencies
  const InvoiceRepository = require('../../repositories/invoiceRepository.js');
  const CustomerRepository = require('../../repositories/customerRepository.js');
  const VendorRepository = require('../../repositories/vendorRepository.js');
  const ItemRepository = require('../../repositories/itemRepository.js');
  const { OcrAnalyzerFactory } = require('../analysis');
  const InvoiceValidator = require('./invoiceValidator');
  const InvoiceResponseFormatter = require('./invoiceResponseFormatter');
  const { AzureInvoiceMapper } = require('../invoiceMapperService/invoiceMapperService');
  const InvoiceLogger = require('./invoiceLogger');
  const s3Service = require('../s3Service');

  // Get OCR type from environment or use default
  const ocrType = process.env.OCR_ANALYZER_TYPE || 'azure';
  const ocrConfig = {};
  
  // Gabungkan default dependencies dengan custom dependencies
  const dependencies = {
    invoiceRepository: new InvoiceRepository(),
    customerRepository: new CustomerRepository(),
    vendorRepository: new VendorRepository(),
    itemRepository: new ItemRepository(),
    documentAnalyzer: OcrAnalyzerFactory.createAnalyzer(ocrType, ocrConfig),
    ocrType,
    ocrConfig,
    validator: new InvoiceValidator(),
    responseFormatter: new InvoiceResponseFormatter(),
    azureMapper: new AzureInvoiceMapper(),
    logger: InvoiceLogger,
    s3Service: s3Service,
    ...customDependencies
  };

  return new InvoiceService(dependencies);
}
// Buat instance default untuk kompatibilitas
const defaultInstance = createInvoiceService();

// Export instance default sebagai export utama
module.exports = defaultInstance;

// Juga export class dan factory function untuk penggunaan yang lebih fleksibel
module.exports.InvoiceService = InvoiceService;
module.exports.createInvoiceService = createInvoiceService;