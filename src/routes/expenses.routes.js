const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const expensesController = require('../modules/expenses/expenses.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.post('/', expensesController.createExpense);
router.get('/', expensesController.listExpenses);

module.exports = router;
