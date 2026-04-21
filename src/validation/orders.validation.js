const { AppError } = require('../utils');
const { ORDER_STATUSES } = require('../constants/order.workflow');
const { normalizeEmail, normalizePhone } = require('./customer.validation');

const ORDER_STATUS_SET = new Set(ORDER_STATUSES);

function assertPositiveInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(`${field} must be a positive integer`, 400, 'VALIDATION_ERROR');
  }
  return n;
}

function parseOptionalDate(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(`Invalid ${field}`, 400, 'VALIDATION_ERROR');
  }
  return d;
}

function validateCreateOrder(body) {
  const customer = body.customer;
  if (!customer || typeof customer !== 'object') {
    throw new AppError('customer object is required', 400, 'VALIDATION_ERROR');
  }

  const phone = normalizePhone(customer.phone);
  const email = normalizeEmail(customer.email);
  const name =
    typeof customer.name === 'string' && customer.name.trim() ? customer.name.trim() : null;

  if (!phone && !email) {
    throw new AppError('customer must include phone and/or email', 400, 'VALIDATION_ERROR');
  }

  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items must be a non-empty array', 400, 'VALIDATION_ERROR');
  }

  const normalized = [];
  for (const line of items) {
    if (typeof line.productId !== 'string' || !line.productId.trim()) {
      throw new AppError('Each item requires productId', 400, 'VALIDATION_ERROR');
    }
    const quantity = assertPositiveInt(line.quantity, 'items.quantity');
    normalized.push({ productId: line.productId.trim(), quantity });
  }

  let shippingCost = 0;
  if (body.shippingCost !== undefined && body.shippingCost !== null) {
    const s = Number(body.shippingCost);
    if (!Number.isFinite(s) || s < 0) {
      throw new AppError('shippingCost must be a non-negative number', 400, 'VALIDATION_ERROR');
    }
    shippingCost = s;
  }

  let codAmount = null;
  if (body.codAmount !== undefined && body.codAmount !== null) {
    const c = Number(body.codAmount);
    if (!Number.isFinite(c) || c < 0) {
      throw new AppError('codAmount must be a non-negative number', 400, 'VALIDATION_ERROR');
    }
    codAmount = c;
  }

  return {
    customer: { phone, email, name },
    items: normalized,
    shippingCost,
    codAmount,
  };
}

function validateListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));

  let status;
  if (query.status !== undefined && query.status !== null && query.status !== '') {
    const s = String(query.status).trim();
    if (!ORDER_STATUS_SET.has(s)) {
      throw new AppError('Invalid status filter', 400, 'VALIDATION_ERROR');
    }
    status = s;
  }

  let customerId;
  if (query.customerId !== undefined && query.customerId !== null && query.customerId !== '') {
    const id = String(query.customerId).trim();
    if (!id) {
      throw new AppError('Invalid customerId', 400, 'VALIDATION_ERROR');
    }
    customerId = id;
  }

  const dateFrom = parseOptionalDate(query.dateFrom, 'dateFrom');
  const dateTo = parseOptionalDate(query.dateTo, 'dateTo');

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new AppError('dateFrom must be before dateTo', 400, 'VALIDATION_ERROR');
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    status,
    customerId,
    dateFrom,
    dateTo,
  };
}

function validateStatusUpdate(body) {
  if (typeof body.status !== 'string' || !ORDER_STATUS_SET.has(body.status)) {
    throw new AppError(
      `status must be one of: ${ORDER_STATUSES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return body.status;
}

module.exports = {
  validateCreateOrder,
  validateListQuery,
  validateStatusUpdate,
};

