const s3Service = require("./s3Service")
const DocumentStatus = require('../models/enums/DocumentStatus');
const Sentry = require("../instrument");

class FinancialDocumentService {
  constructor(documentType, s3Service, logger = console) {
    this.documentType = documentType;
    this.s3Service = s3Service;
    this.logger = logger;
  }

  async uploadFile({ buffer, partnerId }) {
    return Sentry.startSpan(
      {
        name: "financialDocument.uploadFile",
        attributes: {
          documentType: this.documentType,
          partnerId: partnerId || 'undefined',
          hasBuffer: !!buffer
        },
      },
      async (span) => {
        try {
          Sentry.addBreadcrumb({
            category: "financialDocument",
            message: `Starting ${this.documentType} file upload`,
            level: "info",
          });

          if (!partnerId) {
            Sentry.addBreadcrumb({
              category: "financialDocument",
              message: "Upload failed: Partner ID is required",
              level: "error",
            });
            throw new Error("Partner ID is required");
          }
          
          const s3Url = await s3Service.uploadFile(buffer);
          
          if (!s3Url) {
            Sentry.addBreadcrumb({
              category: "financialDocument",
              message: "Upload failed: No URL returned from S3",
              level: "error",
            });
            throw new Error("Failed to upload file to S3");
          }
          
          Sentry.addBreadcrumb({
            category: "financialDocument",
            message: `${this.documentType} file uploaded successfully`,
            level: "info",
            data: { s3Url }
          });
          
          Sentry.captureMessage(`${this.documentType} file uploaded successfully`);
          
          return {
            status: DocumentStatus.PROCESSING,
            partner_id: partnerId,
            file_url: s3Url
          };
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}

module.exports = FinancialDocumentService;