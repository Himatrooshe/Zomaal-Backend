const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const dashboardController = require('../controllers/dashboard.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.get('/kpis', dashboardController.getKpis);

module.exports = router;
