const express = require('express');
const router = express.Router();
const { authMiddleware, storeScopeMiddleware } = require('../middleware');
const productController = require('../controllers/product.controller');

router.use(authMiddleware, storeScopeMiddleware);

router.post('/', productController.createProduct);
router.get('/', productController.listProducts);
router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.archiveProduct);

module.exports = router;
