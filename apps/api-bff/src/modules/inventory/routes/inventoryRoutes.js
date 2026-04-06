/**
 * Inventory Routes - API endpoints for inventory management
 * @module modules/inventory/routes/inventoryRoutes
 */

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { inventorySchemas } = require('../../../shared/validation/schemas');
const { quickAudit } = require('../../audit/middleware/auditMiddleware');

/**
 * Inventory routes:
 * - GET /inventory - Get all inventory movements
 * - GET /inventory/:id - Get movement by ID
 * - POST /inventory - Create new inventory movement
 * - GET /inventory/kardex/:productId - Get kardex history
 * - GET /inventory/low-stock - Get products below minimum stock
 * - GET /inventory/summary - Get inventory summary by category
 * - GET /inventory/stats - Get movement statistics
 * - GET /inventory/stock/:productId - Get current stock
 * - POST /inventory/bulk - Bulk create movements
 * - POST /inventory/validate-stock - Validate stock availability
 */

// GET /inventory - Get all inventory movements (with filters)
router.get('/', authenticateToken, inventoryController.getAllMovements);

// GET /inventory/low-stock - Get products with low stock
router.get('/low-stock', authenticateToken, inventoryController.getLowStockProducts);

// GET /inventory/summary - Get inventory summary by category
router.get('/summary', authenticateToken, inventoryController.getInventorySummary);

// GET /inventory/stats - Get movement statistics
router.get('/stats', authenticateToken, inventoryController.getMovementStats);

// GET /inventory/stock/:productId - Get current stock for a product
router.get('/stock/:productId', authenticateToken, inventoryController.getCurrentStock);

// GET /inventory/kardex/:productId - Get kardex history for a product
router.get('/kardex/:productId', authenticateToken, validate(inventorySchemas.getKardex), inventoryController.getKardex);

// GET /inventory/:id - Get movement by ID
router.get('/:id', authenticateToken, inventoryController.getMovementById);

// POST /inventory - Create new inventory movement (warehouse/admin)
router.post('/', authenticateToken, authorizeRoles('admin', 'warehouse'), validate(inventorySchemas.createMovement), quickAudit.inventoryMovement(), inventoryController.createMovement);

// POST /inventory/bulk - Bulk create movements (warehouse/admin)
router.post('/bulk', authenticateToken, authorizeRoles('admin', 'warehouse'), inventoryController.bulkCreateMovements);

// POST /inventory/validate-stock - Validate stock availability
router.post('/validate-stock', authenticateToken, inventoryController.validateStock);

module.exports = router;
