const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const Sentry = require("../instrument");

class s3Service {
    constructor() {
        this.s3 = new AWS.S3({
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
        this.bucketName = process.env.AWS_BUCKET_NAME;
    }

    /**
     * Upload a file to S3
     * @param {Buffer} fileBuffer - File content as a buffer 
     * @returns {Promise<string>} - Resolves to the uploaded file URL
     */
    async uploadFile(fileBuffer) {
        return Sentry.startSpan(
            {
                name: "s3.uploadFile",
                attributes: {
                    bucketName: this.bucketName,
                    fileType: "pdf"
                },
            },
            async (span) => {
                try {
                    const fileName = `${uuidv4()}.pdf`;
                    const params = {
                        Bucket: this.bucketName,
                        Key: fileName,
                        Body: fileBuffer,        
                    };

                    const data = await this.s3.upload(params).promise();
                    return data.Location;
                } catch (error) {
                    Sentry.addBreadcrumb({
                        category: "s3",
                        message: `Error uploading file to S3: ${error.message}`,
                        level: "error",
                    });
                    Sentry.captureException(error);
                    console.error("S3 Upload Error:", error);
                    throw error;
                } finally {
                    span.end();
                }
            }
        );
    }

    /**
     * Upload a JSON result from OCR analysis to S3
     * @param {Object} jsonData - JSON object containing OCR analysis results
     * @param {string} documentId - Optional identifier to link JSON with original document
     * @returns {Promise<string>} - Resolves to the uploaded JSON file URL
     */
    async uploadJsonResult(jsonData, documentId = null) {
        return Sentry.startSpan(
            {
                name: "s3.uploadJsonResult",
                attributes: {
                    bucketName: this.bucketName,
                    documentId: documentId || "none",
                    fileType: "json"
                },
            },
            async (span) => {
                try {
                    const prefix = documentId ? `${documentId}-analysis-` : 'analysis-';
                    const fileName = `${prefix}${uuidv4()}.json`;
                    const jsonString = JSON.stringify(jsonData, null, 2);
                    const params = {
                        Bucket: this.bucketName,
                        Key: `analysis/${fileName}`,
                        Body: jsonString,
                        ContentType: 'application/json'
                    };
                    const data = await this.s3.upload(params).promise();
                    return data.Location;
                } catch (error) {
                    Sentry.addBreadcrumb({
                        category: "s3",
                        message: `Error uploading JSON to S3: ${error.message}`,
                        level: "error",
                    });
                    Sentry.captureException(error);
                    console.error("S3 JSON Upload Error:", error);
                    throw error;
                } finally {
                    span.end();
                }
            }
        );
    }

    /**
   * Delete a file from S3
   * @param {string} fileKey - The key (path) of the file to delete
   * @returns {Promise<object>} - Object with success status and message or error
   */
    async deleteFile(fileKey) {
        return Sentry.startSpan(
            {
                name: "s3.deleteFile",
                attributes: {
                    bucketName: this.bucketName,
                    fileKey: fileKey
                },
            },
            async (span) => {
                try {
                    const params = {
                        Bucket: this.bucketName,
                        Key: fileKey
                    };
                    await this.s3.deleteObject(params).promise();
                    return {
                        success: true,
                        message: `Successfully deleted file: ${fileKey} from bucket: ${this.bucketName}`
                    };
                } catch (error) {
                    Sentry.addBreadcrumb({
                        category: "s3",
                        message: `Error deleting file from S3: ${error.message}`,
                        level: "error",
                    });
                    Sentry.captureException(error);
                    console.error(`S3 Delete Error: ${error}`);
                    return {
                        success: false,
                        error: error.message,
                        code: error.code || 'UnknownError'
                    };
                } finally {
                    span.end();
                }
            }
        );
    }
}

module.exports = new s3Service();
