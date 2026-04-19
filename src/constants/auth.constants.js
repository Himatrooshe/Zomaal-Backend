/**
 * Store-scoped roles (maps to Prisma StoreRole enum).
 * Use these in roleMiddleware instead of string literals.
 */
const STORE_ROLES = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
});

const PASSWORD_MIN_LENGTH = 8;

module.exports = {
  STORE_ROLES,
  PASSWORD_MIN_LENGTH,
};
