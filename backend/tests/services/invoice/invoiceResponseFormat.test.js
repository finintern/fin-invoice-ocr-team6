const InvoiceResponseFormatter = require('../../../src/services/invoice/invoiceResponseFormatter');

describe('InvoiceResponseFormatter', () => {
    let formatter;

    beforeEach(() => {
        formatter = new InvoiceResponseFormatter();
    });
    
    describe('formatStatusResponse', () => {
        const DocumentStatus = require('../../../src/models/enums/DocumentStatus');
        
        describe('Positive Cases', () => {
            const mockInvoice = {
                file_url: 'https://example.com/invoice.pdf'
            };
            
            test('should format PROCESSING status with default message', () => {
                const result = formatter.formatStatusResponse(mockInvoice, DocumentStatus.PROCESSING);
    
                expect(result).toEqual({
                    message: "Invoice is still being processed. Please try again later.",
                    data: {
                        documents: [],
                        documentUrl: 'https://example.com/invoice.pdf'
                    }
                });
            });
    
            test('should format PROCESSING status with custom message', () => {
                const customMessage = "Your invoice is currently processing. Check back soon.";
                const result = formatter.formatStatusResponse(mockInvoice, DocumentStatus.PROCESSING, customMessage);
    
                expect(result).toEqual({
                    message: customMessage,
                    data: {
                        documents: [],
                        documentUrl: 'https://example.com/invoice.pdf'
                    }
                });
            });
    
            test('should format FAILED status with default message', () => {
                const result = formatter.formatStatusResponse(mockInvoice, DocumentStatus.FAILED);
    
                expect(result).toEqual({
                    message: "Invoice processing failed. Please re-upload the document.",
                    data: {
                        documents: [],
                        documentUrl: 'https://example.com/invoice.pdf'
                    }
                });
            });
    
            test('should format FAILED status with custom message', () => {
                const customMessage = "We couldn't process your invoice. Please try again.";
                const result = formatter.formatStatusResponse(mockInvoice, DocumentStatus.FAILED, customMessage);
    
                expect(result).toEqual({
                    message: customMessage,
                    data: {
                        documents: [],
                        documentUrl: 'https://example.com/invoice.pdf'
                    }
                });
            });
        });
        
        describe('Negative Cases', () => {
            test('should handle null file_url', () => {
                const result = formatter.formatStatusResponse({}, DocumentStatus.PROCESSING);
    
                expect(result).toEqual({
                    message: "Invoice is still being processed. Please try again later.",
                    data: {
                        documents: [],
                        documentUrl: null
                    }
                });
            });
            
            test('should handle completely null invoice object', () => {
                const result = formatter.formatStatusResponse(null, DocumentStatus.FAILED);
    
                expect(result).toEqual({
                    message: "Invoice processing failed. Please re-upload the document.",
                    data: {
                        documents: [],
                        documentUrl: null
                    }
                });
            });
        });
        
        describe('Corner Cases', () => {
            test('should handle undefined status with custom message', () => {
                const customMessage = "Status is not recognized";
                const result = formatter.formatStatusResponse({}, undefined, customMessage);
    
                expect(result).toEqual({
                    message: customMessage,
                    data: {
                        documents: [],
                        documentUrl: null
                    }
                });
            });
            
            test('should handle invalid status with default message fallback', () => {
                const result = formatter.formatStatusResponse({}, 'INVALID_STATUS');
    
                expect(result).toEqual({
                    message: undefined,
                    data: {
                        documents: [],
                        documentUrl: null
                    }
                });
            });
        });
    });
    
    describe('formatInvoiceResponse', () => {
        describe('Positive Cases', () => {
            test('should format invoice data correctly with all data provided', () => {
                const invoice = {
                    invoice_number: 'INV-001',
                    purchase_order_id: 'PO-001',
                    invoice_date: '2023-05-01',
                    due_date: '2023-05-31',
                    payment_terms: 'Net 30',
                    currency_symbol: '$',
                    currency_code: 'USD',
                    total_amount: 1000,
                    subtotal_amount: 900,
                    discount_amount: 50,
                    tax_amount: 150,
                    file_url: 'https://example.com/invoice.pdf'
                };
    
                const items = [
                    {
                        amount: 500,
                        description: 'Item 1',
                        quantity: 5,
                        unit: 'pcs',
                        unit_price: 100
                    },
                    {
                        amount: 400,
                        description: 'Item 2',
                        quantity: 2,
                        unit: 'box',
                        unit_price: 200
                    }
                ];
    
                const customer = {
                    uuid: 'cust-123',
                    name: 'Customer Company',
                    recipient_name: 'John Doe',
                    address: '123 Customer St',
                    tax_id: 'TAX-CUST-123'
                };
    
                const vendor = {
                    name: 'Vendor Company',
                    address: '456 Vendor Ave',
                    recipient_name: 'Jane Smith',
                    tax_id: 'TAX-VEND-456'
                };
    
                const expectedResponse = {
                    data: {
                        documents: [
                            {
                                header: {
                                    invoice_details: {
                                        invoice_number: 'INV-001',
                                        purchase_order_id: 'PO-001',
                                        invoice_date: '2023-05-01',
                                        due_date: '2023-05-31',
                                        payment_terms: 'Net 30'
                                    },
                                    vendor_details: {
                                        name: 'Vendor Company',
                                        address: '456 Vendor Ave',
                                        recipient_name: 'Jane Smith',
                                        tax_id: 'TAX-VEND-456'
                                    },
                                    customer_details: {
                                        id: 'cust-123',
                                        name: 'Customer Company',
                                        recipient_name: 'John Doe',
                                        address: '123 Customer St',
                                        tax_id: 'TAX-CUST-123'
                                    },
                                    financial_details: {
                                        currency: {
                                            currency_symbol: '$',
                                            currency_code: 'USD'
                                        },
                                        total_amount: 1000,
                                        subtotal_amount: 900,
                                        discount_amount: 50,
                                        total_tax_amount: 150
                                    }
                                },
                                items: [
                                    {
                                        amount: 500,
                                        description: 'Item 1',
                                        quantity: 5,
                                        unit: 'pcs',
                                        unit_price: 100
                                    },
                                    {
                                        amount: 400,
                                        description: 'Item 2',
                                        quantity: 2,
                                        unit: 'box',
                                        unit_price: 200
                                    }
                                ]
                            }
                        ],
                        documentUrl: "https://example.com/invoice.pdf"
                    }
                };
    
                const result = formatter.formatInvoiceResponse(invoice, items, customer, vendor);
                expect(result).toEqual(expectedResponse);
            });
        });
        
        describe('Negative Cases', () => {
            test('should handle missing vendor and customer data', () => {
                const invoice = {
                    invoice_number: 'INV-001',
                    purchase_order_id: 'PO-001',
                    invoice_date: '2023-05-01',
                    due_date: '2023-05-31',
                    payment_terms: 'Net 30',
                    currency_symbol: '$',
                    currency_code: 'USD',
                    total_amount: 1000,
                    subtotal_amount: 900,
                    discount_amount: 50,
                    tax_amount: 150
                };
    
                const items = [
                    {
                        amount: 500,
                        description: 'Item 1',
                        quantity: 5,
                        unit: 'pcs',
                        unit_price: 100
                    }
                ];
    
                const result = formatter.formatInvoiceResponse(invoice, items, null, null);
    
                expect(result.data.documents[0].header.vendor_details).toEqual({
                    name: null,
                    address: "",
                    recipient_name: null,
                    tax_id: null
                });
    
                expect(result.data.documents[0].header.customer_details).toEqual({
                    id: null,
                    name: null,
                    recipient_name: null,
                    address: "",
                    tax_id: null
                });
            });
    
            test('should handle missing or invalid items data', () => {
                const invoice = {
                    invoice_number: 'INV-001',
                    purchase_order_id: 'PO-001',
                    invoice_date: '2023-05-01',
                    due_date: '2023-05-31',
                    payment_terms: 'Net 30',
                    currency_symbol: '$',
                    currency_code: 'USD',
                    total_amount: 1000,
                    subtotal_amount: 900,
                    discount_amount: 50,
                    tax_amount: 150
                };
    
                const customer = {
                    uuid: 'cust-123',
                    name: 'Customer Company',
                    recipient_name: 'John Doe',
                    address: '123 Customer St',
                    tax_id: 'TAX-CUST-123'
                };
    
                const vendor = {
                    name: 'Vendor Company',
                    address: '456 Vendor Ave',
                    recipient_name: 'Jane Smith',
                    tax_id: 'TAX-VEND-456'
                };
    
                // Test with null items
                let result = formatter.formatInvoiceResponse(invoice, null, customer, vendor);
                expect(result.data.documents[0].items).toEqual([]);
    
                // Test with non-array items
                result = formatter.formatInvoiceResponse(invoice, "not an array", customer, vendor);
                expect(result.data.documents[0].items).toEqual([]);
            });
            
            test('should handle null file_url in invoice', () => {
                const invoice = {
                    invoice_number: 'INV-001',
                    purchase_order_id: 'PO-001',
                    invoice_date: '2023-05-01',
                    file_url: null
                };
                
                const result = formatter.formatInvoiceResponse(invoice, [], null, null);
                expect(result.data.documentUrl).toBeNull();
            });
        });
        
        describe('Corner Cases', () => {
            test('should handle empty address fields in vendor and customer', () => {
                const invoice = {
                    invoice_number: 'INV-001',
                    purchase_order_id: 'PO-001',
                    invoice_date: '2023-05-01',
                    due_date: '2023-05-31',
                    payment_terms: 'Net 30',
                    currency_symbol: '$',
                    currency_code: 'USD',
                    total_amount: 1000,
                    subtotal_amount: 900,
                    discount_amount: 50,
                    tax_amount: 150
                };
    
                const customer = {
                    uuid: 'cust-123',
                    name: 'Customer Company',
                    recipient_name: 'John Doe',
                    tax_id: 'TAX-CUST-123'
                    // address is missing
                };
    
                const vendor = {
                    name: 'Vendor Company',
                    recipient_name: 'Jane Smith',
                    tax_id: 'TAX-VEND-456'
                    // address is missing
                };
    
                const result = formatter.formatInvoiceResponse(invoice, [], customer, vendor);
    
                expect(result.data.documents[0].header.vendor_details.address).toBe("");
                expect(result.data.documents[0].header.customer_details.address).toBe("");
            });
            
            test('should handle undefined invoice fields', () => {
                const invoice = {
                    // Most fields are missing
                    invoice_number: 'INV-001'
                };
                
                const result = formatter.formatInvoiceResponse(invoice, [], null, null);
                
                // Verify that missing fields are undefined rather than causing errors
                expect(result.data.documents[0].header.invoice_details.invoice_number).toBe('INV-001');
                expect(result.data.documents[0].header.invoice_details.purchase_order_id).toBeUndefined();
                expect(result.data.documents[0].header.financial_details.total_amount).toBeUndefined();
            });
        });
    });
});