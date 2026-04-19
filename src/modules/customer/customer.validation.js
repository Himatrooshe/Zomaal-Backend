const { AppError } = require('../../utils');

function normalizeEmail(email) {
  if (email === undefined || email === null) return null;
  if (typeof email !== 'string') return null;
  const t = email.trim().toLowerCase();
  return t.length ? t : null;
}

function normalizePhone(phone) {
  if (phone === undefined || phone === null) return null;
  if (typeof phone !== 'string') return null;
  const t = phone.replace(/\s+/g, '').trim();
  return t.length ? t : null;
}

function validateUpsertCustomer(body) {
  const phone = normalizePhone(body.phone);
  const email = normalizeEmail(body.email);
  const name =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;

  if (!phone && !email) {
    throw new AppError('Either phone or email is required', 400, 'VALIDATION_ERROR');
  }

  return { phone, email, name };
}

function validateListQuery(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = {
  validateUpsertCustomer,
  validateListQuery,
  normalizeEmail,
  normalizePhone,
};
