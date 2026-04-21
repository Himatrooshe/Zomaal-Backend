const authService = require('../services/auth.service');
const { AppError, catchAsync } = require('../utils');

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, storeName, currency, trialDays } = req.body;
  const data = await authService.signup({
    name,
    email,
    password,
    storeName,
    currency,
    trialDays,
  });
  res.status(201).json({ success: true, data });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password, storeId } = req.body;
  const data = await authService.login({ email, password, storeId });
  res.json({ success: true, data });
});

exports.refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  const data = await authService.refresh({ refreshToken });
  res.json({ success: true, data });
});

exports.logout = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  const data = await authService.logout({ refreshToken });
  res.json({ success: true, data });
});

exports.getMe = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  const data = await authService.getMe({
    userId: req.user.userId,
    storeId: req.user.storeId,
  });
  res.json({ success: true, data });
});

