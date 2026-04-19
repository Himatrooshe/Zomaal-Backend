const IORedis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const config = require('../../config');
const ordersService = require('../orders/orders.service');
const customersService = require('../customers/customers.service');

const QUEUE_NAMES = Object.freeze({
  CHECK_DELAYED_ORDERS: 'checkDelayedOrders',
  UPDATE_CUSTOMER_RISK: 'updateCustomerRisk',
  RECALCULATE_KPIS: 'recalculateKPIs',
});

let connection;
const queueInstances = new Map();

function getConnection() {
  if (!connection) {
    connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

function getQueue(name) {
  if (!queueInstances.has(name)) {
    queueInstances.set(
      name,
      new Queue(name, {
        connection: getConnection(),
      })
    );
  }
  return queueInstances.get(name);
}

/**
 * Registers workers in-process. Use ENABLE_JOB_WORKERS=0 to skip (e.g. API-only dynos).
 */
function registerWorkers() {
  const conn = getConnection();

  const delayedWorker = new Worker(
    QUEUE_NAMES.CHECK_DELAYED_ORDERS,
    async (job) => {
      const { storeId } = job.data;
      const orders = await ordersService.getDelayedOrders(storeId);
      return { delayedCount: orders.length };
    },
    { connection: conn }
  );

  const riskWorker = new Worker(
    QUEUE_NAMES.UPDATE_CUSTOMER_RISK,
    async (job) => {
      const { storeId } = job.data;
      return customersService.reconcileStoreCustomerRisk(storeId);
    },
    { connection: conn }
  );

  const kpiWorker = new Worker(
    QUEUE_NAMES.RECALCULATE_KPIS,
    async () => ({
      ok: true,
      message: 'Placeholder — KPI snapshots not persisted in this phase',
    }),
    { connection: conn }
  );

  return [delayedWorker, riskWorker, kpiWorker];
}

async function enqueueCheckDelayedOrders(storeId) {
  return getQueue(QUEUE_NAMES.CHECK_DELAYED_ORDERS).add(
    'run',
    { storeId },
    { removeOnComplete: 50, removeOnFail: 25 }
  );
}

async function enqueueUpdateCustomerRisk(storeId) {
  return getQueue(QUEUE_NAMES.UPDATE_CUSTOMER_RISK).add(
    'run',
    { storeId },
    { removeOnComplete: 50, removeOnFail: 25 }
  );
}

async function enqueueRecalculateKpis(storeId) {
  return getQueue(QUEUE_NAMES.RECALCULATE_KPIS).add(
    'run',
    { storeId },
    { removeOnComplete: 50, removeOnFail: 25 }
  );
}

module.exports = {
  QUEUE_NAMES,
  getConnection,
  getQueue,
  registerWorkers,
  enqueueCheckDelayedOrders,
  enqueueUpdateCustomerRisk,
  enqueueRecalculateKpis,
};
