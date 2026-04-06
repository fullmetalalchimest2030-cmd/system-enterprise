/**
 * Product routes
 * @module modules/products/routes/productRoutes
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { productSchemas } = require('../../../shared/validation/schemas');
const { quickAudit } = require('../../audit/middleware/auditMiddleware');

/**
 * Product routes
 * - GET /products - Get all products
 * - GET /products/:id - Get product by ID
 * - POST /products - Create a new product
 * - PUT /products/:id - Update a product
 * - DELETE /products/:id - Delete a product
 * - GET /products/category/:categoryId - Get products by category
 * - GET /products/low-stock - Get products with low stock
 * - PUT /products/:id/stock - Update product stock
 * - GET /products/search?q - Search products
 * - PUT /products/:id/restore - Restore a deleted product
 */

// GET /products - Get all products (protected)
router.get('/', authenticateToken, productController.getAllProducts);

// GET /products/search - Search products (protected)
router.get('/search', authenticateToken, productController.searchProducts);

// GET /products/low-stock - Get products with low stock (protected)
router.get('/low-stock', authenticateToken, productController.getLowStockProducts);

// GET /products/:id - Get product by ID (protected)
router.get('/:id', authenticateToken, validate(productSchemas.getById), productController.getProductById);

// GET /products/category/:categoryId - Get products by category (protected)
router.get('/category/:categoryId', authenticateToken, productController.getProductsByCategory);

// POST /products - Create a new product
router.post('/', authenticateToken, authorizeRoles('admin', 'warehouse'), validate(productSchemas.create), quickAudit.productCreate(), productController.createProduct);

// PUT /products/:id - Update a product
router.put('/:id', authenticateToken, authorizeRoles('admin', 'warehouse'), validate(productSchemas.update), quickAudit.productUpdate(), productController.updateProduct);

// DELETE /products/:id - Delete a product
router.delete('/:id', authenticateToken, authorizeRoles('admin'), quickAudit.productDelete(), productController.deleteProduct);

// PUT /products/:id/stock - Update product stock
router.put('/:id/stock', authenticateToken, authorizeRoles('admin', 'warehouse'), productController.updateStock);

// PUT /products/:id/restore - Restore a deleted product
router.put('/:id/restore', authenticateToken, authorizeRoles('admin'), productController.restoreProduct);

// PATCH /products/:id/catalog - Toggle catalog visibility (admin/warehouse)
router.patch('/:id/catalog', authenticateToken, authorizeRoles('admin', 'warehouse'), productController.setCatalogVisibility);
router.put('/:id/catalog', authenticateToken, authorizeRoles('admin', 'warehouse'), productController.setCatalogVisibility);

module.exports = router;
