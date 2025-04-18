const express = require('express');
const router = express.Router();
const { purchaseOrderController } = require('../controllers/purchaseOrderController');
const authMiddleware = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware')

router.post(
    '/upload',
    authMiddleware,               
    uploadMiddleware,
    purchaseOrderController.uploadPurchaseOrder
);

router.get('/:id',authMiddleware, PurchaseOrderController.getPurchaseOrderById);


module.exports = router;
