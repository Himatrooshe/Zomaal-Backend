const { catchAsync } = require('../../utils');
const customersService = require('./customers.service');

function parseListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

exports.getCustomerRisk = catchAsync(async (req, res) => {
  const data = await customersService.getCustomerRisk(req.storeId, req.params.id);
  res.json({ success: true, data });
});

exports.listBlacklisted = catchAsync(async (req, res) => {
  const query = parseListQuery(req.query);
  const result = await customersService.listBlacklistedCustomers(req.storeId, query);
  res.json({ success: true, data: result });
});
