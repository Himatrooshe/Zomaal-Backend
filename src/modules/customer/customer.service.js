const prisma = require('../../db');
const { AppError } = require('../../utils');

async function findExistingCustomer(client, storeId, phone, email) {
  if (phone && email) {
    return client.customer.findFirst({
      where: {
        storeId,
        OR: [{ phone }, { email }],
      },
    });
  }
  if (phone) {
    return client.customer.findFirst({
      where: { storeId, phone },
    });
  }
  if (email) {
    return client.customer.findFirst({
      where: { storeId, email },
    });
  }
  return null;
}

async function upsertCustomerWithClient(client, storeId, { phone, email, name }) {
  const existing = await findExistingCustomer(client, storeId, phone, email);
  if (existing) {
    const updates = {};
    if (name && name !== existing.name) updates.name = name;
    if (Object.keys(updates).length) {
      const customer = await client.customer.update({
        where: { id: existing.id },
        data: updates,
      });
      return { customer, wasCreated: false };
    }
    return { customer: existing, wasCreated: false };
  }

  const customer = await client.customer.create({
    data: {
      storeId,
      phone,
      email,
      name,
    },
  });
  return { customer, wasCreated: true };
}

async function upsertCustomerByContact(storeId, payload) {
  return upsertCustomerWithClient(prisma, storeId, payload);
}

async function listCustomers(storeId, { page, limit, skip }) {
  const where = { storeId };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

async function getCustomerById(storeId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId },
  });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }
  return customer;
}

module.exports = {
  upsertCustomerByContact,
  upsertCustomerWithClient,
  listCustomers,
  getCustomerById,
};
