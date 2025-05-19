const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const sandboxController = require('../controllers/sandboxPOController');
const sandboxInvoiceController = require('../controllers/sandboxInvoiceController');

/**
 * @swagger
 * tags:
 *   name: Sandbox
 *   description: API endpoints for testing and sandbox functionality
 */

/**
 * @swagger
 * /sandbox/purchase-orders/upload:
 *   post:
 *     summary: Mock endpoint to upload a purchase order file
 *     tags: [Sandbox]
 *     description: Uploads a purchase order file and returns a mocked analysis response
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The purchase order PDF file to upload
 *     responses:
 *       200:
 *         description: Purchase order successfully processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       400:
 *         description: Bad request, no file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: 
 *                 message:
 *                   type: string
 *                   example: No file uploaded
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error in sandbox purchase order processing
 *                 error:
 *                   type: string
 *                   example: Detailed error information
 */
router.post('/purchase-orders/upload', uploadMiddleware, sandboxController.mockUploadPurchaseOrder);

/**
 * @swagger
 * /sandbox/purchase-orders/status/{id}:
 *   get:
 *     summary: Mock endpoint to get purchase order status
 *     tags: [Sandbox]
 *     description: Retrieves the mocked status of a purchase order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the purchase order
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Purchase order status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrderStatus'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error in sandbox purchase order status retrieval
 *                 error:
 *                   type: string
 *                   example: Detailed error information
 */
router.get('/purchase-orders/status/:id', sandboxController.mockGetPurchaseOrderStatus);

/**
 * @swagger
 * /sandbox/purchase-orders/{id}:
 *   get:
 *     summary: Mock endpoint to get purchase order details by ID
 *     tags: [Sandbox]
 *     description: Retrieves the mocked details of a purchase order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the purchase order
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Purchase order details retrieved successfully
 *         content:
 *           application/json:
 *             schema: 
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error in sandbox purchase order details retrieval
 *                 error:
 *                   type: string
 *                   example: Detailed error information
 */
router.get('/purchase-orders/:id', sandboxController.mockGetPurchaseOrderById);

/**
 * @swagger
 * /sandbox/invoices/upload:
 *   post:
 *     summary: Mock endpoint to upload an invoice file
 *     tags: [Sandbox]
 *     description: Uploads an invoice file and returns a mocked analysis response
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The invoice PDF file to upload
 *     responses:
 *       200:
 *         description: Invoice upload initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 'Invoice upload initiated'
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: '14380379-ae81-4fee-ac1a-5c475857a047'
 *                     status:
 *                       type: string
 *                       enum: ['Processing', 'Analyzed', 'Failed']
 *                       example: 'Processing'
 *       400:
 *         description: Bad request, no file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: 
 *                 message:
 *                   type: string
 *                   example: No file uploaded
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error in sandbox invoice processing
 *                 error:
 *                   type: string
 *                   example: Detailed error information
 */
router.post('/invoices/upload', uploadMiddleware, sandboxInvoiceController.mockUploadInvoice);

/**
 * @swagger
 * /sandbox/invoices/status/{id}:
 *   get:
 *     summary: Mock endpoint to get invoice status
 *     tags: [Sandbox]
 *     description: Retrieves the mocked status of an invoice by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the invoice
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: '123e4567-e89b-12d3-a456-426614174000'
 *                 status:
 *                   type: string
 *                   enum: ['Processing', 'Analyzed', 'Failed']
 *                   example: 'Analyzed'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error in sandbox invoice status retrieval
 *                 error:
 *                   type: string
 *                   example: Detailed error information
 */
router.get('/invoices/status/:id', sandboxInvoiceController.mockGetInvoiceStatus);

/**
 * @swagger
 * /sandbox/invoices/{id}:
 *   get:
 *     summary: Mock endpoint to get invoice details by ID
 *     tags: [Sandbox]
 *     description: Retrieves the mocked details of an invoice by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the invoice
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invoice details retrieved successfully
 *         content:
 *           application/json:
 *             schema: 
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           header:
 *                             type: object
 *                             properties:
 *                               invoice_details:
 *                                 type: object
 *                                 properties:
 *                                   invoice_number:
 *                                     type: string
 *                                     example: 'INV-3337'
 *                                   purchase_order_id:
 *                                     type: string
 *                                     example: '12345'
 *                                   invoice_date:
 *                                     type: string
 *                                     format: date-time
 *                                     example: '2016-01-24T17:00:00.000Z'
 *                                   due_date:
 *                                     type: string
 *                                     format: date-time
 *                                     example: '2016-01-30T17:00:00.000Z'
 *                                   payment_terms:
 *                                     type: string
 *                                     nullable: true
 *                                     example: null
 *                               vendor_details:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                     example: 'SlicedInvoices'
 *                                   address:
 *                                     type: string
 *                                     example: 'Suite 5A-1204 123 Somewhere Street Your City AZ 12345'
 *                                   recipient_name:
 *                                     type: string
 *                                     example: 'DEMO - Sliced Invoices'
 *                                   tax_id:
 *                                     type: string
 *                                     nullable: true
 *                                     example: null
 *                               customer_details:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                     format: uuid
 *                                     example: '1aca895c-0b1f-4536-a482-733398a84a9a'
 *                                   name:
 *                                     type: string
 *                                     example: 'Test Business'
 *                                   recipient_name:
 *                                     type: string
 *                                     example: 'Test Business'
 *                                   address:
 *                                     type: string
 *                                     example: '123 Somewhere St Melbourne, VIC 3000'
 *                                   tax_id:
 *                                     type: string
 *                                     nullable: true
 *                                     example: null
 *                               financial_details:
 *                                 type: object
 *                                 properties:
 *                                   currency:
 *                                     type: object
 *                                     properties:
 *                                       currency_symbol:
 *                                         type: string
 *                                         example: '$'
 *                                       currency_code:
 *                                         type: string
 *                                         example: 'AUD'
 *                                   total_amount:
 *                                     type: string
 *                                     example: '93.50'
 *                                   subtotal_amount:
 *                                     type: string
 *                                     example: '85.00'
 *                                   discount_amount:
 *                                     type: string
 *                                     nullable: true
 *                                     example: null
 *                                   total_tax_amount:
 *                                     type: string
 *                                     example: '8.50'
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 amount:
 *                                   type: string
 *                                   example: '85.00'
 *                                 description:
 *                                   type: string
 *                                   example: 'Web Design This is a sample description ...'
 *                                 quantity:
 *                                   type: number
 *                                   example: 1
 *                                 unit:
 *                                   type: string
 *                                   nullable: true
 *                                   example: null
 *                                 unit_price:
 *                                   type: string
 *                                   example: '85.00'
 *                     documentUrl:
 *                       type: string
 *                       example: 'https://s3.ap-southeast-3.amazonaws.com/sandbox.intern.fineksi.com/9e44df23-0da1-44b8-b5df-9117a912190b.pdf'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error in sandbox invoice details retrieval
 *                 error:
 *                   type: string
 *                   example: Detailed error information
 */
router.get('/invoices/:id', sandboxInvoiceController.mockGetInvoiceById);

module.exports = router;
