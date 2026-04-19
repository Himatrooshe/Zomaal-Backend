const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../db');
const { AppError } = require('../utils');

/**
 * Verifies Bearer access JWT, then ensures user, store, and membership still exist
 * (revoked users / deleted stores cannot use old tokens). Attaches { userId, role, storeId }.
 */
async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'zomaal-api',
    });
  } catch {
    return next(new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'));
  }

  const { userId, role, storeId } = payload;
  if (!userId || !role || !storeId) {
    return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new AppError('Authentication required', 401, 'USER_REVOKED'));
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return next(new AppError('Store no longer available', 403, 'STORE_NOT_FOUND'));
    }

    const membership = await prisma.storeUser.findUnique({
      where: {
        userId_storeId: { userId, storeId },
      },
    });

    if (!membership) {
      return next(new AppError('Forbidden', 403, 'STORE_ACCESS_DENIED'));
    }

    if (membership.role !== role) {
      return next(new AppError('Token no longer valid for this membership', 403, 'TOKEN_STALE'));
    }

    req.user = { userId, role, storeId };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = authMiddleware;
