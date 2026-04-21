const prisma = require('../db');
const { AppError } = require('../utils');

function riskScoreFromCustomer(row) {
  return row.returnCount + row.cancelCount + row.refusalCount;
}

async function syncBlacklistWithClient(tx, storeId, customerId) {
  if (!customerId) return;

  const [customer, settings] = await Promise.all([
    tx.customer.findFirst({
      where: { id: customerId, storeId },
    }),
    tx.storeSetting.findUnique({ where: { storeId } }),
  ]);

  if (!customer) return;

  const threshold = settings?.blacklistThreshold ?? 3;
  const riskScore = riskScoreFromCustomer(customer);
  const isBlacklisted = riskScore >= threshold;

  await tx.customer.update({
    where: { id: customerId },
    data: {
      isBlacklisted,
      riskLevel: riskScore,
    },
  });
}

async function getCustomerRisk(storeId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  const settings = await prisma.storeSetting.findUnique({ where: { storeId } });
  const threshold = settings?.blacklistThreshold ?? 3;
  const riskScore = riskScoreFromCustomer(customer);

  return {
    customerId: customer.id,
    returnCount: customer.returnCount,
    cancelCount: customer.cancelCount,
    refusalCount: customer.refusalCount,
    riskScore,
    blacklistThreshold: threshold,
    isBlacklisted: customer.isBlacklisted,
  };
}

async function listBlacklistedCustomers(storeId, { page, limit, skip }) {
  const where = { storeId, isBlacklisted: true };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

/**
 * Full-store pass for background jobs: recompute blacklist flags from counters.
 */
async function reconcileStoreCustomerRisk(storeId) {
  const customers = await prisma.customer.findMany({
    where: { storeId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const c of customers) {
      await syncBlacklistWithClient(tx, storeId, c.id);
    }
  });

  return { processed: customers.length };
}

module.exports = {
  riskScoreFromCustomer,
  syncBlacklistWithClient,
  getCustomerRisk,
  listBlacklistedCustomers,
  reconcileStoreCustomerRisk,
};

