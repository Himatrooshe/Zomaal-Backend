const { AppError } = require('../utils');

/**
 * Restricts route to users whose JWT store role is one of allowedRoles (StoreRole values).
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = { roleMiddleware };
