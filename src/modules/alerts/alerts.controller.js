const { catchAsync } = require('../../utils');
const alertsService = require('./alerts.service');

exports.listAlerts = catchAsync(async (req, res) => {
  const items = await alertsService.getAlerts(req.storeId);
  res.json({ success: true, data: { items } });
});
