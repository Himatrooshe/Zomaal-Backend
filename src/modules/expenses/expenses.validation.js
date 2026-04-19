const { AppError } = require('../../utils');

const EXPENSE_TYPE_MAP = Object.freeze({
  ads: 'ADS',
  purchase: 'PURCHASE',
  shipping: 'SHIPPING',
  other: 'OTHER',
});

function normalizeExpenseType(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new AppError('type is required', 400, 'VALIDATION_ERROR');
  }
  const key = input.trim().toLowerCase();
  const mapped = EXPENSE_TYPE_MAP[key];
  if (!mapped) {
    throw new AppError('type must be ads, purchase, shipping, or other', 400, 'VALIDATION_ERROR');
  }
  return mapped;
}

function validateCreateExpense(body) {
  const type = normalizeExpenseType(body.type);
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('amount must be a positive number', 400, 'VALIDATION_ERROR');
  }
  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;

  return { type, amount, note };
}

function validateListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = {
  validateCreateExpense,
  validateListQuery,
};
