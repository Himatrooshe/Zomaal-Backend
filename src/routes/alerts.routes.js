const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const alertsController = require('../modules/alerts/alerts.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.get('/', alertsController.listAlerts);

module.exports = router;
