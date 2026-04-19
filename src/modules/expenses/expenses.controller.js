const { catchAsync } = require('../../utils');
const expensesService = require('./expenses.service');
const { validateCreateExpense, validateListQuery } = require('./expenses.validation');

exports.createExpense = catchAsync(async (req, res) => {
  const payload = validateCreateExpense(req.body);
  const row = await expensesService.createExpense(req.storeId, payload);
  res.status(201).json({ success: true, data: row });
});

exports.listExpenses = catchAsync(async (req, res) => {
  const query = validateListQuery(req.query);
  const result = await expensesService.listExpenses(req.storeId, query);
  res.json({ success: true, data: result });
});
