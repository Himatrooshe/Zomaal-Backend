const prisma = require('../../db');

async function createExpense(storeId, payload) {
  return prisma.expense.create({
    data: {
      storeId,
      type: payload.type,
      amount: payload.amount,
      note: payload.note,
    },
  });
}

async function listExpenses(storeId, { page, limit, skip }) {
  const where = { storeId };

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

module.exports = {
  createExpense,
  listExpenses,
};
