const { catchAsync } = require('../utils');
const dashboardService = require('../services/dashboard.service');

exports.getKpis = catchAsync(async (req, res) => {
  const data = await dashboardService.getDashboardKpis(req.storeId);
  res.json({ success: true, data });
});

