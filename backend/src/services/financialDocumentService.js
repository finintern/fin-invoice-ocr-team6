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
  
  /**
   * Upload OCR analysis results as JSON to S3
   * @param {Object} analysisResults - The OCR analysis results object
   * @param {string} documentId - Identifier for the original document
   * @returns {Promise<string>} - URL of the uploaded JSON file
   */
  async uploadAnalysisResults(analysisResults, documentId) {
    return Sentry.startSpan(
      {
        name: "financialDocument.uploadAnalysisResults",
        attributes: {
          documentType: this.documentType,
          documentId: documentId || 'undefined',
          hasResults: !!analysisResults
        },
      },
      async (span) => {
        try {
          Sentry.addBreadcrumb({
            category: "financialDocument",
            message: `Starting ${this.documentType} analysis results upload for document: ${documentId || 'unknown'}`,
            level: "info",
          });
          
          if (!analysisResults) {
            Sentry.addBreadcrumb({
              category: "financialDocument",
              message: "Upload failed: Analysis results are required",
              level: "error",
            });
            throw new Error("Analysis results are required");
          }
          
          // Upload the JSON data to S3
          const jsonUrl = await s3Service.uploadJsonResult(analysisResults, documentId);
          
          if (!jsonUrl) {
            Sentry.addBreadcrumb({
              category: "financialDocument",
              message: "Upload failed: No URL returned from S3 for JSON results",
              level: "error",
            });
            throw new Error("Failed to upload analysis results to S3");
          }
          
          Sentry.addBreadcrumb({
            category: "financialDocument",
            message: `${this.documentType} analysis results uploaded successfully for document: ${documentId || 'unknown'}`,
            level: "info",
            data: { jsonUrl }
          });
          
          Sentry.captureMessage(`${this.documentType} analysis results uploaded successfully`);
          
          return jsonUrl;
        } catch (error) {
          Sentry.addBreadcrumb({
            category: "financialDocument",
            message: `Error uploading analysis results: ${error.message}`,
            level: "error",
          });
          
          Sentry.captureException(error);
          console.error("Error uploading analysis results:", error);
          throw new Error(`Failed to store analysis results: ${error.message}`);
        } finally {
          span.end();
        }
      }
    );
  }
}

module.exports = FinancialDocumentService;