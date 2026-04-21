const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware, storeMiddleware } = require('../middleware');
const returnsController = require('../controllers/returns.controller');

router.use(authMiddleware, storeScopeMiddleware, storeMiddleware);

router.post('/scan', returnsController.scanReturn);
router.post('/manual', returnsController.manualReturn);
router.patch('/:id/status', returnsController.updateReturnStatus);

module.exports = router;
