const prisma = require('../db');
const { AppError } = require('../utils');
const { ORDER_NEXT_STATUSES } = require('../constants/order.workflow');
const { upsertCustomerWithClient } = require('./customer.service');
const { syncBlacklistWithClient } = require('./customers.service');

const ORDER_DETAIL_INCLUDE = {
  items: { include: { product: { select: { id: true, title: true, sku: true } } } },
  customer: true,
};

const ORDER_LIST_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
  items: {
    include: {
      product: { select: { id: true, title: true } },
    },
  },
};

function resolveUnitPrice(prices, orderQuantity) {
  const applicable = prices.filter((p) => p.quantity <= orderQuantity);
  if (applicable.length === 0) {
    return null;
  }
  applicable.sort((a, b) => b.quantity - a.quantity);
  return applicable[0].price;
}

function assertOrderTransition(current, next) {
  const allowed = ORDER_NEXT_STATUSES[current];
  if (!allowed || !allowed.has(next)) {
    throw new AppError(`Invalid status transition: ${current} → ${next}`, 400, 'INVALID_TRANSITION');
  }
}

async function assertOrderInStore(orderId, storeId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: ORDER_DETAIL_INCLUDE,
  });
  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }
  return order;
}

async function detectDuplicateOrder(tx, storeId, customerId, customerPhone, productIds) {
  if (!customerPhone) {
    return false;
  }
  const settings = await tx.storeSetting.findUnique({ where: { storeId } });
  const windowMinutes = settings?.duplicateOrderWindowMinutes ?? 120;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const dup = await tx.order.findFirst({
    where: {
      storeId,
      customerId,
      createdAt: { gte: windowStart },
      items: { some: { productId: { in: productIds } } },
    },
    select: { id: true },
  });
  return Boolean(dup);
}

async function createOrder(storeId, payload) {
  return prisma.$transaction(async (tx) => {
    const { customer: customerPayload, items, shippingCost, codAmount } = payload;

    const { customer } = await upsertCustomerWithClient(tx, storeId, customerPayload);
    const productIds = [...new Set(items.map((i) => i.productId))];
    const isDuplicate = await detectDuplicateOrder(tx, storeId, customer.id, customer.phone, productIds);

    const lineComputations = [];

    for (const line of items) {
      const product = await tx.product.findFirst({
        where: {
          id: line.productId,
          storeId,
          isArchived: false,
        },
        include: { prices: true },
      });

      if (!product) {
        throw new AppError(`Product not available: ${line.productId}`, 400, 'INVALID_PRODUCT');
      }

      if (!product.isActive) {
        throw new AppError(`Product is inactive: ${line.productId}`, 400, 'INVALID_PRODUCT');
      }

      if (product.prices.length === 0) {
        throw new AppError(`Product has no price tiers: ${line.productId}`, 400, 'INVALID_PRODUCT');
      }

      const unitPrice = resolveUnitPrice(product.prices, line.quantity);
      if (unitPrice === null) {
        throw new AppError(
          `No price tier applies for quantity ${line.quantity} (product ${line.productId})`,
          400,
          'PRICING_ERROR'
        );
      }

      if (product.stock < line.quantity) {
        throw new AppError(`Insufficient stock for product ${product.title}`, 400, 'INSUFFICIENT_STOCK');
      }

      const lineTotal = unitPrice * line.quantity;
      lineComputations.push({
        product,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
      });
    }

    const itemsTotal = lineComputations.reduce((sum, l) => sum + l.lineTotal, 0);
    const totalAmount = itemsTotal + shippingCost;

    const order = await tx.order.create({
      data: {
        storeId,
        customerId: customer.id,
        status: 'PENDING',
        totalAmount,
        codAmount,
        shippingCost,
        isDuplicate,
      },
    });

    for (const comp of lineComputations) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: comp.product.id,
          quantity: comp.quantity,
          price: comp.unitPrice,
        },
      });

      await tx.product.update({
        where: { id: comp.product.id },
        data: { stock: { decrement: comp.quantity } },
      });
    }

    await tx.customer.update({
      where: { id: customer.id },
      data: { totalOrdersCount: { increment: 1 } },
    });

    const orderRow = await tx.order.findUnique({
      where: { id: order.id },
      include: ORDER_DETAIL_INCLUDE,
    });

    const custRow = await tx.customer.findUnique({
      where: { id: customer.id },
      select: { isBlacklisted: true },
    });
    const warnings = custRow?.isBlacklisted ? ['⚠️ High-risk customer'] : [];

    return { order: orderRow, warnings };
  });
}

function buildListWhere(storeId, filters) {
  const where = { storeId };
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.customerId) {
    where.customerId = filters.customerId;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.createdAt.lte = filters.dateTo;
    }
  }
  return where;
}

async function listOrders(storeId, filters) {
  const where = buildListWhere(storeId, filters);
  const { page, limit, skip } = filters;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: ORDER_LIST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function getOrderById(storeId, orderId) {
  return assertOrderInStore(orderId, storeId);
}

async function updateOrderStatus(storeId, orderId, nextStatus) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId },
    include: { items: true },
  });

  if (!order) {
    throw new AppError('Order not found', 404, 'NOT_FOUND');
  }

  if (order.status === nextStatus) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_DETAIL_INCLUDE,
    });
  }

  assertOrderTransition(order.status, nextStatus);

  return prisma.$transaction(async (tx) => {
    const wasCancelled = order.status === 'CANCELLED';
    const becomesCancelled = nextStatus === 'CANCELLED';

    if (becomesCancelled && !wasCancelled) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { cancelCount: { increment: 1 } },
        });
        await syncBlacklistWithClient(tx, storeId, order.customerId);
      }
    }

    const wasReturned = order.status === 'RETURNED';
    const becomesReturned = nextStatus === 'RETURNED';
    if (becomesReturned && !wasReturned && order.customerId) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { returnCount: { increment: 1 } },
      });
      await syncBlacklistWithClient(tx, storeId, order.customerId);
    }

    const data = { status: nextStatus };
    if (nextStatus === 'DELIVERED') {
      data.isDelivered = true;
    }
    if (nextStatus === 'RETURNED') {
      data.isReturned = true;
    }

    await tx.order.update({
      where: { id: orderId },
      data,
    });

    return tx.order.findUnique({
      where: { id: orderId },
      include: ORDER_DETAIL_INCLUDE,
    });
  });
}

async function getDelayedOrders(storeId) {
  const settings = await prisma.storeSetting.findUnique({ where: { storeId } });
  const days = settings?.delayedOrderThresholdDays ?? 7;
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);

  return prisma.order.findMany({
    where: {
      storeId,
      createdAt: { lt: cutoff },
      isReturned: false,
      status: { notIn: ['CANCELLED', 'RETURNED'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, title: true, sku: true } },
        },
      },
    },
  });
}

module.exports = {
  createOrder,
  listOrders,
  getOrderById,
  updateOrderStatus,
  getDelayedOrders,
};

