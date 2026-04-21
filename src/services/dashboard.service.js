const prisma = require('../db');

async function getKpiCounts(storeId) {
  const where = { storeId };

  const [totalOrders, deliveredOrders, returnedOrders, cancelledOrders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.order.count({ where: { ...where, status: 'RETURNED' } }),
    prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
  ]);

  return { totalOrders, deliveredOrders, returnedOrders, cancelledOrders };
}

async function getDashboardKpis(storeId) {
  const { totalOrders, deliveredOrders, returnedOrders, cancelledOrders } = await getKpiCounts(
    storeId
  );

  const deliveryRate = totalOrders > 0 ? deliveredOrders / totalOrders : 0;
  const returnRate = totalOrders > 0 ? returnedOrders / totalOrders : 0;

  return {
    totalOrders,
    deliveredOrders,
    returnedOrders,
    cancelledOrders,
    deliveryRate,
    returnRate,
  };
}

module.exports = {
  getKpiCounts,
  getDashboardKpis,
};

