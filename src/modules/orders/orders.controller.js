const { catchAsync } = require('../../utils');
const ordersService = require('./orders.service');
const {
  validateCreateOrder,
  validateListQuery,
  validateStatusUpdate,
} = require('./orders.validation');

exports.createOrder = catchAsync(async (req, res) => {
  const payload = validateCreateOrder(req.body);
  const { order, warnings } = await ordersService.createOrder(req.storeId, payload);
  res.status(201).json({ success: true, data: order, warnings });
});

exports.listOrders = catchAsync(async (req, res) => {
  const query = validateListQuery(req.query);
  const result = await ordersService.listOrders(req.storeId, query);
  res.json({ success: true, data: result });
});

exports.getOrder = catchAsync(async (req, res) => {
  const order = await ordersService.getOrderById(req.storeId, req.params.id);
  res.json({ success: true, data: order });
});

exports.updateOrderStatus = catchAsync(async (req, res) => {
  const status = validateStatusUpdate(req.body);
  const order = await ordersService.updateOrderStatus(req.storeId, req.params.id, status);
  res.json({ success: true, data: order });
});
