const swaggerJsdoc = require('swagger-jsdoc');

// Swagger definition
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Financial Invoice OCR API',
      version: '1.0.0',
      description: 'API documentation for financial invoice and purchase order OCR processing system',
      contact: {
        name: 'Team 6',
        url: 'https://github.com/yourusername/fin-invoice-ocr-team6',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        PurchaseOrderStatus: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'sandbox-po-789012'
            },
            status: {
              type: 'string',
              enum: ['Processing', 'Analyzed', 'Failed'],
              example: 'Analyzed'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-15T08:30:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-15T08:30:00.000Z'
            }
          }
        },
        PurchaseOrderItem: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              example: 'Beef - Baby, Liver'
            },
            quantity: {
              type: 'number',
              example: 1
            },
            unit: {
              type: 'string',
              example: ''
            },
            price: {
              type: 'number',
              format: 'float',
              example: 23.00
            }
          }
        },
        PurchaseOrder: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'sandbox-po-789012'
            },
            partner_id: {
              type: 'string',
              example: 'sandbox-partner-123456'
            },
            status: {
              type: 'string',
              enum: ['Processing', 'Analyzed', 'Failed'],
              example: 'Analyzed'
            },
            invoice_number: {
              type: 'string',
              example: 'INV-0013'
            },
            invoice_date: {
              type: 'string',
              format: 'date',
              example: '1987-01-12'
            },
            billing_company: {
              type: 'string',
              example: 'Quisque porta volutpat erat'
            },
            billing_address: {
              type: 'string',
              example: '9 Glendale Court, Nashville, Tennessee, 37205, United States'
            },
            shipping_name: {
              type: 'string',
              example: 'Bobbe Rafter'
            },
            shipping_address: {
              type: 'string',
              example: '9 Glendale Court, Nashville, Tennessee, 37205, United States'
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PurchaseOrderItem'
              }
            },
            total_amount: {
              type: 'number',
              format: 'float',
              example: 52.00
            },
            file_url: {
              type: 'string',
              example: 'https://mock-s3-bucket.s3.amazonaws.com/sandbox-po-789012.pdf'
            },
            analysis_url: {
              type: 'string',
              example: 'https://mock-s3-bucket.s3.amazonaws.com/analysis/sandbox-po-789012-analysis.json'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-15T08:30:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-15T08:30:00.000Z'
            }          
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
