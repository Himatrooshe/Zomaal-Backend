const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const config = require('../config');
const { AppError } = require('../utils');
const { PASSWORD_MIN_LENGTH } = require('../constants/auth.constants');

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function signAccessToken({ userId, role, storeId }) {
  const minutes = config.jwt.accessExpiresMin;
  return jwt.sign(
    { userId, role, storeId },
    config.jwt.accessSecret,
    { expiresIn: `${minutes}m`, issuer: 'zomaal-api' }
  );
}

function assertPasswordPolicy(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      400,
      'VALIDATION_ERROR'
    );
  }
}

function assertEmail(email) {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new AppError('Valid email is required', 400, 'VALIDATION_ERROR');
  }
}

async function createSessionRecord({ userId, storeId, refreshToken }) {
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresDays);

  await prisma.session.create({
    data: {
      userId,
      storeId,
      refreshTokenHash,
      expiresAt,
    },
  });
}

/**
 * Issues access JWT (minimal payload) + opaque refresh token persisted (hashed) in Session.
 */
async function issueAuthTokens({ userId, storeId, role }) {
  const accessToken = signAccessToken({ userId, role, storeId });
  const refreshToken = generateRefreshToken();
  await createSessionRecord({ userId, storeId, refreshToken });
  return { accessToken, refreshToken };
}

async function formatAuthResponse(user, activeMembership, accessToken, refreshToken) {
  const memberships = await prisma.storeUser.findMany({
    where: { userId: user.id },
    include: { store: true },
    orderBy: { id: 'asc' },
  });

  const store = activeMembership.store;

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    store: {
      id: store.id,
      name: store.name,
      currency: store.currency,
      trialEndsAt: store.trialEndsAt,
      role: activeMembership.role,
    },
    memberships: memberships.map((m) => ({
      storeId: m.storeId,
      role: m.role,
      store: {
        id: m.store.id,
        name: m.store.name,
        currency: m.store.currency,
      },
    })),
  };
}

function normalizeOptionalStoreId(storeId) {
  if (storeId === undefined || storeId === null) return undefined;
  const s = String(storeId).trim();
  return s.length ? s : undefined;
}

async function resolveMembership(userId, storeId) {
  if (storeId) {
    const membership = await prisma.storeUser.findUnique({
      where: {
        userId_storeId: { userId, storeId },
      },
      include: { store: true },
    });
    if (!membership) {
      throw new AppError(
        'No membership for that store. Omit storeId to use your default store, or pass storeId from a signup/login response (data.store.id or memberships[].storeId).',
        403,
        'STORE_ACCESS_DENIED'
      );
    }
    return membership;
  }

  const membership = await prisma.storeUser.findFirst({
    where: { userId },
    include: { store: true },
    orderBy: { id: 'asc' },
  });

  if (!membership) {
    throw new AppError('User has no store memberships', 403, 'NO_MEMBERSHIPS');
  }

  return membership;
}

async function signup({ name, email, password, storeName, currency, trialDays }) {
  assertEmail(email);
  assertPasswordPolicy(password);

  if (typeof name !== 'string' || !name.trim()) {
    throw new AppError('Name is required', 400, 'VALIDATION_ERROR');
  }
  if (typeof storeName !== 'string' || !storeName.trim()) {
    throw new AppError('Store name is required', 400, 'VALIDATION_ERROR');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const days = Number.isFinite(Number(trialDays)) ? Number(trialDays) : 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + days);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('Email already exists', 409, 'EMAIL_CONFLICT');
  }

  const { user, membership } = await prisma.$transaction(async (tx) => {
    const userRow = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    const storeRow = await tx.store.create({
      data: {
        name: storeName.trim(),
        currency: typeof currency === 'string' && currency.trim() ? currency.trim() : 'USD',
        trialEndsAt,
      },
    });

    const storeUserRow = await tx.storeUser.create({
      data: {
        userId: userRow.id,
        storeId: storeRow.id,
        role: 'OWNER',
      },
      include: { store: true },
    });

    await tx.storeSetting.create({
      data: {
        storeId: storeRow.id,
      },
    });

    return { user: userRow, membership: storeUserRow };
  });

  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: user.id,
    storeId: membership.storeId,
    role: membership.role,
  });

  return formatAuthResponse(user, membership, accessToken, refreshToken);
}

async function login({ email, password, storeId }) {
  assertEmail(email);
  if (typeof password !== 'string' || !password) {
    throw new AppError('Password is required', 400, 'VALIDATION_ERROR');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const membership = await resolveMembership(user.id, normalizeOptionalStoreId(storeId));
  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: user.id,
    storeId: membership.storeId,
    role: membership.role,
  });

  return formatAuthResponse(user, membership, accessToken, refreshToken);
}

async function refresh({ refreshToken }) {
  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    throw new AppError('Refresh token is required', 400, 'VALIDATION_ERROR');
  }

  const tokenHash = hashRefreshToken(refreshToken.trim());
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: tokenHash },
    include: { user: true, store: true },
  });

  if (!session || session.expiresAt <= new Date()) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const membership = await prisma.storeUser.findUnique({
    where: {
      userId_storeId: {
        userId: session.userId,
        storeId: session.storeId,
      },
    },
    include: { store: true },
  });

  if (!membership) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    throw new AppError('Session invalid', 401, 'SESSION_REVOKED');
  }

  const newRefresh = generateRefreshToken();
  const newHash = hashRefreshToken(newRefresh);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresDays);

  await prisma.$transaction(async (tx) => {
    await tx.session.delete({ where: { id: session.id } });
    await tx.session.create({
      data: {
        userId: session.userId,
        storeId: session.storeId,
        refreshTokenHash: newHash,
        expiresAt,
      },
    });
  });

  const accessToken = signAccessToken({
    userId: session.userId,
    role: membership.role,
    storeId: session.storeId,
  });

  return formatAuthResponse(session.user, membership, accessToken, newRefresh);
}

async function logout({ refreshToken }) {
  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    throw new AppError('Refresh token is required', 400, 'VALIDATION_ERROR');
  }

  const tokenHash = hashRefreshToken(refreshToken.trim());
  const result = await prisma.session.deleteMany({
    where: { refreshTokenHash: tokenHash },
  });

  if (result.count === 0) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  return { loggedOut: true };
}

async function getMe({ userId, storeId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      stores: {
        include: { store: true },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const membership = user.stores.find((s) => s.storeId === storeId);
  if (!membership) {
    throw new AppError('Store membership not found', 403, 'STORE_ACCESS_DENIED');
  }

  const memberships = await prisma.storeUser.findMany({
    where: { userId: user.id },
    include: { store: true },
    orderBy: { id: 'asc' },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    store: {
      id: membership.store.id,
      name: membership.store.name,
      currency: membership.store.currency,
      trialEndsAt: membership.store.trialEndsAt,
      role: membership.role,
    },
    memberships: memberships.map((m) => ({
      storeId: m.storeId,
      role: m.role,
      store: {
        id: m.store.id,
        name: m.store.name,
        currency: m.store.currency,
      },
    })),
  };
}

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
};
