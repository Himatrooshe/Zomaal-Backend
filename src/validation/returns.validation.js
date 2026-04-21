const { AppError } = require('../utils');
const { RETURN_STATUSES } = require('../constants/return.workflow');
const { normalizePhone } = require('./customer.validation');

const RETURN_STATUS_SET = new Set(RETURN_STATUSES);

function assertPositiveInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new AppError(`${field} must be a positive integer`, 400, 'VALIDATION_ERROR');
  }
  return n;
}

function validateScanReturn(body) {
  const trackingId =
    typeof body.trackingId === 'string' && body.trackingId.trim() ? body.trackingId.trim() : null;
  const orderReference =
    typeof body.orderReference === 'string' && body.orderReference.trim()
      ? body.orderReference.trim()
      : null;
  const phone = normalizePhone(body.phone);

  if (!trackingId && !orderReference && !phone) {
    throw new AppError('Provide trackingId, orderReference, and/or phone', 400, 'VALIDATION_ERROR');
  }

  return { trackingId, orderReference, phone };
}

function validateManualReturn(body) {
  if (typeof body.orderId !== 'string' || !body.orderId.trim()) {
    throw new AppError('orderId is required', 400, 'VALIDATION_ERROR');
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

  let status = 'PENDING';
  if (body.status !== undefined && body.status !== null && body.status !== '') {
    const s = String(body.status).trim();
    if (!RETURN_STATUS_SET.has(s)) {
      throw new AppError(
        `status must be one of: ${RETURN_STATUSES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }
    status = s;
  }

  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;
  const comment =
    typeof body.comment === 'string' && body.comment.trim() ? body.comment.trim() : null;

  return {
    orderId: body.orderId.trim(),
    items: normalized,
    status,
    reason,
    comment,
  };
}

function validateReturnStatus(body) {
  if (typeof body.status !== 'string' || !RETURN_STATUS_SET.has(body.status.trim())) {
    throw new AppError(
      `status must be one of: ${RETURN_STATUSES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
  return body.status.trim();
}

module.exports = {
  validateScanReturn,
  validateManualReturn,
  validateReturnStatus,
};

