const { catchAsync } = require('../../utils');
const customerService = require('./customer.service');
const { validateUpsertCustomer, validateListQuery } = require('./customer.validation');

exports.createOrFindCustomer = catchAsync(async (req, res) => {
  const data = validateUpsertCustomer(req.body);
  const { customer, wasCreated } = await customerService.upsertCustomerByContact(req.storeId, data);
  res.status(wasCreated ? 201 : 200).json({
    success: true,
    data: customer,
    meta: { wasCreated },
  });
});

exports.listCustomers = catchAsync(async (req, res) => {
  const query = validateListQuery(req.query);
  const result = await customerService.listCustomers(req.storeId, query);
  res.json({ success: true, data: result });
});

exports.getCustomer = catchAsync(async (req, res) => {
  const customer = await customerService.getCustomerById(req.storeId, req.params.id);
  res.json({ success: true, data: customer });
});
