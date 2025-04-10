const express = require('express');
const router = express.Router();
const PurchaseOrderController = require('../controllers/purchaseOrderController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post(
    '/upload',
    authMiddleware,               
    PurchaseOrderController.uploadMiddleware,
    PurchaseOrderController.uploadPurchaseOrder
);

router.get('/:id',authMiddleware, PurchaseOrderController.getPurchaseOrderById);


module.exports = router;
