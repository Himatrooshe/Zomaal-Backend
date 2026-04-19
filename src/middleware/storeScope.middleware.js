const { AppError } = require('../utils');

/**
 * Binds the authenticated JWT store to req.storeId (access token is already store-scoped).
 */
function storeScopeMiddleware(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }
  req.storeId = req.user.storeId;
  next();
}

module.exports = storeScopeMiddleware;
