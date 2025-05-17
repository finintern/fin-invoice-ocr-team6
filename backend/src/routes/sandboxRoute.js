const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const sandboxController = require('../controllers/sandboxController');

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

module.exports = router;
