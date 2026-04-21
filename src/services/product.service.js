const prisma = require('../db');
const { AppError } = require('../utils');

async function assertProductInStore(productId, storeId) {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
  });
  if (!product) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
  return product;
}

async function createProduct(storeId, data) {
  const sku = data.sku;
  if (sku) {
    const dup = await prisma.product.findFirst({
      where: { storeId, sku, isArchived: false },
    });
    if (dup) {
      throw new AppError('SKU already exists in this store', 409, 'SKU_CONFLICT');
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        storeId,
        title: data.title,
        sku,
        description: data.description,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
      },
    });

    await tx.productPrice.createMany({
      data: data.prices.map((p) => ({
        productId: product.id,
        quantity: p.quantity,
        price: p.price,
      })),
    });

    return tx.product.findUnique({
      where: { id: product.id },
      include: { prices: { orderBy: { quantity: 'asc' } } },
    });
  });
}

async function listProducts(storeId, { page, limit, skip, includeArchived }) {
  const where = {
    storeId,
    ...(includeArchived ? {} : { isArchived: false }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { prices: { orderBy: { quantity: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function updateProduct(storeId, productId, patch) {
  await assertProductInStore(productId, storeId);

  if (patch.sku) {
    const dup = await prisma.product.findFirst({
      where: {
        storeId,
        sku: patch.sku,
        isArchived: false,
        NOT: { id: productId },
      },
    });
    if (dup) {
      throw new AppError('SKU already exists in this store', 409, 'SKU_CONFLICT');
    }
  }

  const { prices, ...rest } = patch;

  return prisma.$transaction(async (tx) => {
    if (Object.keys(rest).length) {
      await tx.product.update({
        where: { id: productId },
        data: rest,
      });
    }

    if (prices) {
      await tx.productPrice.deleteMany({ where: { productId } });
      await tx.productPrice.createMany({
        data: prices.map((p) => ({
          productId,
          quantity: p.quantity,
          price: p.price,
        })),
      });
    }

    return tx.product.findUnique({
      where: { id: productId },
      include: { prices: { orderBy: { quantity: 'asc' } } },
    });
  });
}

async function archiveProduct(storeId, productId) {
  const product = await assertProductInStore(productId, storeId);
  if (product.isArchived) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: { prices: { orderBy: { quantity: 'asc' } } },
    });
  }

  return prisma.product.update({
    where: { id: productId },
    data: { isArchived: true, isActive: false },
    include: { prices: { orderBy: { quantity: 'asc' } } },
  });
}

module.exports = {
  createProduct,
  listProducts,
  updateProduct,
  archiveProduct,
};

