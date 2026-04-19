const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const storesRoutes = require('./stores.routes');
const customersRoutes = require('./customers.routes');
const productsRoutes = require('./products.routes');
const ordersRoutes = require('./orders.routes');
const returnsRoutes = require('./returns.routes');
const transactionsRoutes = require('./transactions.routes');
const kpiRoutes = require('./kpi.routes');
const integrationsRoutes = require('./integrations.routes');
const dashboardRoutes = require('./dashboard.routes');
const expensesRoutes = require('./expenses.routes');
const alertsRoutes = require('./alerts.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount all routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/stores', storesRoutes);
router.use('/customers', customersRoutes);
router.use('/products', productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/returns', returnsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/kpi', kpiRoutes);
router.use('/integrations', integrationsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/expenses', expensesRoutes);
router.use('/alerts', alertsRoutes);

module.exports = router;
