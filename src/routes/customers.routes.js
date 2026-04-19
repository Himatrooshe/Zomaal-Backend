const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const customerController = require('../modules/customer/customer.controller');
const customersController = require('../modules/customers/customers.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.get('/blacklisted', customersController.listBlacklisted);
router.get('/:id/risk', customersController.getCustomerRisk);
router.post('/', customerController.createOrFindCustomer);
router.get('/', customerController.listCustomers);
router.get('/:id', customerController.getCustomer);

module.exports = router;
