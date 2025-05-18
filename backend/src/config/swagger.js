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
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
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
        InvoiceStatus: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
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
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            partner_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174001'
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
              example: 'https://mock-s3-bucket.s3.amazonaws.com/123e4567-e89b-12d3-a456-426614174000.pdf'
            },
            analysis_url: {
              type: 'string',
              example: 'https://mock-s3-bucket.s3.amazonaws.com/analysis/123e4567-e89b-12d3-a456-426614174000-analysis.json'
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
        InvoiceItem: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              example: 'Web Design'
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
              example: 85.00
            }
          }
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            partner_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174001'
            },
            status: {
              type: 'string',
              enum: ['Processing', 'Analyzed', 'Failed'],
              example: 'Analyzed'
            },
            invoice_number: {
              type: 'string',
              example: 'INV-3337'
            },
            invoice_date: {
              type: 'string',
              format: 'date',
              example: '2016-01-25'
            },
            due_date: {
              type: 'string',
              format: 'date',
              example: '2016-01-31'
            },
            total_amount: {
              type: 'number',
              format: 'float',
              example: 93.50
            },
            subtotal_amount: {
              type: 'number',
              format: 'float',
              example: 85.00
            },
            tax_amount: {
              type: 'number',
              format: 'float',
              example: 8.50
            },
            discount_amount: {
              type: 'number',
              format: 'float',
              example: 0.00
            },
            currency_symbol: {
              type: 'string',
              example: '$'
            },
            currency_code: {
              type: 'string',
              example: 'USD'
            },
            payment_terms: {
              type: 'string',
              example: '30 days'
            },
            customer: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'Test Business'
                },
                address: {
                  type: 'string',
                  example: '123 Somewhere St, Melbourne, VIC 3000'
                },
                email: {
                  type: 'string',
                  example: 'test@test.com'
                }
              }
            },
            vendor: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'DEMO - Sliced Invoices'
                },
                address: {
                  type: 'string',
                  example: 'Suite 5A-1204, 123 Somewhere Street, Your City AZ 12345'
                },
                email: {
                  type: 'string',
                  example: 'admin@slicedinvoices.com'
                }
              }
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/InvoiceItem'
              }
            },
            file_url: {
              type: 'string',
              example: 'https://mock-s3-bucket.s3.amazonaws.com/sandbox-invoice-789012.pdf'
            },
            analysis_url: {
              type: 'string',
              example: 'https://mock-s3-bucket.s3.amazonaws.com/analysis/sandbox-invoice-789012-analysis.json'
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
