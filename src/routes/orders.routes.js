const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const ordersController = require('../modules/orders/orders.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.post('/', ordersController.createOrder);
router.get('/', ordersController.listOrders);
router.get('/:id', ordersController.getOrder);
router.patch('/:id/status', ordersController.updateOrderStatus);

module.exports = router;
