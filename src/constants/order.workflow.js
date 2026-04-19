/**
 * Forward-only order lifecycle. Keys and targets are Prisma OrderStatus values.
 */
const ORDER_NEXT_STATUSES = Object.freeze({
  PENDING: new Set(['CONFIRMED', 'CANCELLED']),
  CONFIRMED: new Set(['SHIPPED']),
  SHIPPED: new Set(['DELIVERED']),
  DELIVERED: new Set(['RETURNED']),
  CANCELLED: new Set(),
  RETURNED: new Set(),
});

const ORDER_STATUSES = Object.freeze([
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
]);

module.exports = {
  ORDER_NEXT_STATUSES,
  ORDER_STATUSES,
};
