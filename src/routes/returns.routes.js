const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const returnsController = require('../modules/returns/returns.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.post('/scan', returnsController.scanReturn);
router.post('/manual', returnsController.manualReturn);
router.patch('/:id/status', returnsController.updateReturnStatus);

module.exports = router;
