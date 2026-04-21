const { AppError } = require('../utils');

function assertNonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(`${field} is required`, 400, 'VALIDATION_ERROR');
  }
}

function assertPositiveInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new AppError(`${field} must be a non-negative integer`, 400, 'VALIDATION_ERROR');
  }
  return n;
}

function assertPositiveNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(`${field} must be a positive number`, 400, 'VALIDATION_ERROR');
  }
  return n;
}

function validateCreateProduct(body) {
  assertNonEmptyString(body.title, 'title');
  const prices = body.prices;
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new AppError('At least one price tier is required', 400, 'VALIDATION_ERROR');
  }
  for (const p of prices) {
    const qty = assertPositiveInt(p.quantity, 'prices.quantity');
    if (qty < 1) {
      throw new AppError('prices.quantity must be at least 1', 400, 'VALIDATION_ERROR');
    }
    assertPositiveNumber(p.price, 'prices.price');
  }
  const quantities = prices.map((p) => p.quantity);
  if (new Set(quantities).size !== quantities.length) {
    throw new AppError('Duplicate quantity in price tiers', 400, 'VALIDATION_ERROR');
  }

  const stock = body.stock !== undefined ? assertPositiveInt(body.stock, 'stock') : 0;
  const low =
    body.lowStockThreshold !== undefined
      ? assertPositiveInt(body.lowStockThreshold, 'lowStockThreshold')
      : 5;

  return {
    title: body.title.trim(),
    sku: typeof body.sku === 'string' && body.sku.trim() ? body.sku.trim() : null,
    description:
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null,
    stock,
    lowStockThreshold: low,
    prices: prices.map((p) => ({
      quantity: Number(p.quantity),
      price: Number(p.price),
    })),
  };
}

function validateUpdateProduct(body) {
  const patch = {};
  if (body.title !== undefined) {
    assertNonEmptyString(body.title, 'title');
    patch.title = body.title.trim();
  }
  if (body.sku !== undefined) {
    patch.sku = typeof body.sku === 'string' && body.sku.trim() ? body.sku.trim() : null;
  }
  if (body.description !== undefined) {
    patch.description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (body.stock !== undefined) {
    patch.stock = assertPositiveInt(body.stock, 'stock');
  }
  if (body.lowStockThreshold !== undefined) {
    patch.lowStockThreshold = assertPositiveInt(body.lowStockThreshold, 'lowStockThreshold');
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      throw new AppError('isActive must be boolean', 400, 'VALIDATION_ERROR');
    }
    patch.isActive = body.isActive;
  }

  if (body.prices !== undefined) {
    if (!Array.isArray(body.prices) || body.prices.length === 0) {
      throw new AppError('prices must be a non-empty array when provided', 400, 'VALIDATION_ERROR');
    }
    const prices = [];
    for (const p of body.prices) {
      const qty = assertPositiveInt(p.quantity, 'prices.quantity');
      if (qty < 1) {
        throw new AppError('prices.quantity must be at least 1', 400, 'VALIDATION_ERROR');
      }
      assertPositiveNumber(p.price, 'prices.price');
      prices.push({ quantity: Number(p.quantity), price: Number(p.price) });
    }
    const quantities = prices.map((p) => p.quantity);
    if (new Set(quantities).size !== quantities.length) {
      throw new AppError('Duplicate quantity in price tiers', 400, 'VALIDATION_ERROR');
    }
    patch.prices = prices;
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError('No valid fields to update', 400, 'VALIDATION_ERROR');
  }

  return patch;
}

function validateListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const includeArchived = query.includeArchived === 'true' || query.includeArchived === '1';
  return { page, limit, includeArchived, skip: (page - 1) * limit };
}

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateListQuery,
};

