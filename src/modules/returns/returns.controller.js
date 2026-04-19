const { catchAsync } = require('../../utils');
const returnsService = require('./returns.service');
const {
  validateScanReturn,
  validateManualReturn,
  validateReturnStatus,
} = require('./returns.validation');

exports.scanReturn = catchAsync(async (req, res) => {
  const input = validateScanReturn(req.body);
  const created = await returnsService.scanReturn(req.storeId, input);
  res.status(201).json({ success: true, data: created });
});

exports.manualReturn = catchAsync(async (req, res) => {
  const payload = validateManualReturn(req.body);
  const created = await returnsService.createManualReturn(req.storeId, payload);
  res.status(201).json({ success: true, data: created });
});

exports.updateReturnStatus = catchAsync(async (req, res) => {
  const status = validateReturnStatus(req.body);
  const data = await returnsService.updateReturnStatus(req.storeId, req.params.id, status);
  res.json({ success: true, data });
});
