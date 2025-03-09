const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/upload', authMiddleware, InvoiceController.uploadMiddleware,InvoiceController.uploadInvoice);

router.get('/:id', InvoiceController.getInvoiceById);
router.post('/analyze', InvoiceController.analyzeInvoice);
router.delete('/:id', authMiddleware, InvoiceController.deleteInvoiceById);

module.exports = router;
