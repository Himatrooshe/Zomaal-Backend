const prisma = require('../db');
const { AppError } = require('../utils');
const { syncBlacklistWithClient } = require('./customers.service');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RETURN_DETAIL_INCLUDE = {
  order: {
    select: {
      id: true,
      status: true,
      externalId: true,
      totalAmount: true,
      customerId: true,
    },
  },
  items: {
    include: {
      product: { select: { id: true, title: true, sku: true } },
    },
  },
};

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

async function findOrderForScan(client, storeId, { trackingId, orderReference, phone }) {
  const tid = trackingId;
  const ref = orderReference;
  const ph = phone;

  const include = { items: true };

  if (ref && isUuid(ref)) {
    const o = await client.order.findFirst({
      where: { id: ref.trim(), storeId },
      include,
    });
    if (o) return o;
  }

  if (tid) {
    const o = await client.order.findFirst({
      where: { storeId, externalId: tid },
      include,
    });
    if (o) return o;
  }

  if (ref && !isUuid(ref)) {
    const o = await client.order.findFirst({
      where: { storeId, externalId: ref },
      include,
    });
    if (o) return o;
  }

  if (ph) {
    const cust = await client.customer.findFirst({
      where: { storeId, phone: ph },
    });
    if (cust) {
      const o = await client.order.findFirst({
        where: { storeId, customerId: cust.id },
        orderBy: { createdAt: 'desc' },
        include,
      });
      if (o) return o;
    }
  }

  return null;
}

async function scanReturn(storeId, input) {
  return prisma.$transaction(async (tx) => {
    const order = await findOrderForScan(tx, storeId, input);

    if (order) {
      const scannedAt = new Date();

      return tx.return.create({
        data: {
          storeId,
          orderId: order.id,
          verificationStatus: 'VERIFIED',
          scannedAt,
          items: {
            create: order.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          },
        },
        include: RETURN_DETAIL_INCLUDE,
      });
    }

    const scanMetadata = {
      trackingId: input.trackingId || null,
      orderReference: input.orderReference || null,
      phone: input.phone || null,
    };

    return tx.return.create({
      data: {
        storeId,
        orderId: null,
        verificationStatus: 'NEEDS_REVIEW',
        scannedAt: null,
        scanMetadata,
      },
      include: RETURN_DETAIL_INCLUDE,
    });
  });
}

async function updateReturnStatus(storeId, returnId, nextStatus) {
  return prisma.$transaction(async (tx) => {
    const ret = await tx.return.findFirst({
      where: { id: returnId, storeId },
      include: { order: { select: { id: true, customerId: true } } },
    });

    if (!ret) {
      throw new AppError('Return not found', 404, 'NOT_FOUND');
    }

    if (ret.status === nextStatus) {
      return tx.return.findUnique({
        where: { id: returnId },
        include: RETURN_DETAIL_INCLUDE,
      });
    }

    const wasRefused = ret.status === 'REFUSED';
    const becomesRefused = nextStatus === 'REFUSED';

    await tx.return.update({
      where: { id: returnId },
      data: { status: nextStatus },
    });

    if (becomesRefused && !wasRefused && ret.order?.customerId) {
      await tx.customer.update({
        where: { id: ret.order.customerId },
        data: { refusalCount: { increment: 1 } },
      });
      await syncBlacklistWithClient(tx, storeId, ret.order.customerId);
    }

    return tx.return.findUnique({
      where: { id: returnId },
      include: RETURN_DETAIL_INCLUDE,
    });
  });
}

async function createManualReturn(storeId, payload) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: payload.orderId, storeId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    const available = new Map();
    for (const line of order.items) {
      available.set(line.productId, (available.get(line.productId) || 0) + line.quantity);
    }

    for (const line of payload.items) {
      const cap = available.get(line.productId);
      if (cap === undefined) {
        throw new AppError(`Product not on order: ${line.productId}`, 400, 'INVALID_PRODUCT');
      }
      if (line.quantity > cap) {
        throw new AppError(
          `Return quantity exceeds ordered for product ${line.productId}`,
          400,
          'INVALID_QUANTITY'
        );
      }
    }

    return tx.return.create({
      data: {
        storeId,
        orderId: order.id,
        status: payload.status,
        reason: payload.reason,
        comment: payload.comment,
        verificationStatus: 'NEEDS_REVIEW',
        scannedAt: null,
        items: {
          create: payload.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
      include: RETURN_DETAIL_INCLUDE,
    });
  });
}

module.exports = {
  scanReturn,
  createManualReturn,
  updateReturnStatus,
};

