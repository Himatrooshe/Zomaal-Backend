const { AppError } = require('../utils');

/**
 * Resolves target store id from route param, X-Store-Id header, body, or query.
 * Ensures it matches the store encoded in the access token (single active store per token).
 */
function resolveStoreId(req) {
  return (
    req.params.storeId ||
    req.headers['x-store-id'] ||
    req.body?.storeId ||
    req.query?.storeId ||
    req.storeId
  );
}

function storeMiddleware(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const storeId = resolveStoreId(req);
  if (!storeId) {
    return next(new AppError('Store context required', 400, 'STORE_REQUIRED'));
  }

  if (storeId !== req.user.storeId) {
    return next(new AppError('Forbidden for this store', 403, 'STORE_MISMATCH'));
  }

  next();
}

module.exports = {
  storeMiddleware,
  resolveStoreId,
};
