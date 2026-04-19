const prisma = require('../../db');
const dashboardService = require('../dashboard/dashboard.service');

async function getAlerts(storeId) {
  const settings = await prisma.storeSetting.findUnique({ where: { storeId } });
  const counts = await dashboardService.getKpiCounts(storeId);

  const alerts = [];
  const timestamp = new Date().toISOString();

  const returnThreshold = settings?.alertReturnRatePercent ?? 10;
  const cancelThreshold = settings?.alertCancelRatePercent ?? 10;
  const backlogMin = settings?.alertUnprocessedOrdersMin ?? 25;

  if (counts.totalOrders > 0) {
    const returnPct = (counts.returnedOrders / counts.totalOrders) * 100;
    if (returnPct > returnThreshold) {
      alerts.push({
        type: 'warning',
        message: `Return rate is above threshold (${returnPct.toFixed(1)}% > ${returnThreshold}%)`,
        timestamp,
      });
    }

    const cancelPct = (counts.cancelledOrders / counts.totalOrders) * 100;
    if (cancelPct > cancelThreshold) {
      alerts.push({
        type: 'warning',
        message: `Cancellation rate is above threshold (${cancelPct.toFixed(1)}% > ${cancelThreshold}%)`,
        timestamp,
      });
    }
  }

  const unprocessed = await prisma.order.count({
    where: {
      storeId,
      status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED'] },
    },
  });

  if (unprocessed >= backlogMin) {
    alerts.push({
      type: 'info',
      message: `Processing backlog: ${unprocessed} orders not yet delivered`,
      timestamp,
    });
  }

  const blacklistOrders24h = await prisma.order.count({
    where: {
      storeId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      customer: { isBlacklisted: true },
    },
  });

  if (blacklistOrders24h > 0) {
    alerts.push({
      type: 'warning',
      message: `Blacklisted customer activity: ${blacklistOrders24h} order(s) placed in the last 24 hours`,
      timestamp,
    });
  }

  return alerts;
}

module.exports = {
  getAlerts,
};
