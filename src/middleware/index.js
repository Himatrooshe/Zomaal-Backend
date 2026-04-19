const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const authMiddleware = require('./auth.middleware');
const storeScopeMiddleware = require('./storeScope.middleware');
const { storeMiddleware, resolveStoreId } = require('./store.middleware');
const { roleMiddleware } = require('./role.middleware');

module.exports = {
  errorHandler,
  notFound,
  authMiddleware,
  storeScopeMiddleware,
  storeMiddleware,
  resolveStoreId,
  roleMiddleware,
};
