const { catchAsync } = require('../../utils');
const productService = require('./product.service');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateListQuery,
} = require('./product.validation');

exports.createProduct = catchAsync(async (req, res) => {
  const data = validateCreateProduct(req.body);
  const product = await productService.createProduct(req.storeId, data);
  res.status(201).json({ success: true, data: product });
});

exports.listProducts = catchAsync(async (req, res) => {
  const query = validateListQuery(req.query);
  const result = await productService.listProducts(req.storeId, query);
  res.json({ success: true, data: result });
});

exports.updateProduct = catchAsync(async (req, res) => {
  const patch = validateUpdateProduct(req.body);
  const product = await productService.updateProduct(req.storeId, req.params.id, patch);
  res.json({ success: true, data: product });
});

exports.archiveProduct = catchAsync(async (req, res) => {
  const product = await productService.archiveProduct(req.storeId, req.params.id);
  res.json({ success: true, data: product });
});
