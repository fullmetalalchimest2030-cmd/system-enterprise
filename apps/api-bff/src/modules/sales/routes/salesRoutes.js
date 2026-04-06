/**
 * Sales Routes - API endpoints for sales management
 * @module modules/sales/routes/salesRoutes
 */

const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { saleSchemas } = require('../../../shared/validation/schemas');
const { quickAudit } = require('../../audit/middleware/auditMiddleware');

/**
 * Sales routes:
 * - GET /sales - Get all sales
 * - GET /sales/:id - Get sale by ID
 * - POST /sales - Create new sale
 * - PUT /sales/:id - Update sale
 * - DELETE /sales/:id - Cancel sale
 * - POST /sales/:id/complete - Complete pending sale
 * - GET /sales/today - Get today's sales
 * - GET /sales/stats - Get sales statistics
 * - GET /sales/employee/:employeeId - Get sales by employee
 * - POST /sales/quick-sale - Process quick sale (POS)
 * - POST /sales/calculate-total - Calculate sale total
 */

// GET /sales - Get all sales
router.get('/', authenticateToken, salesController.getAllSales);

// GET /sales/today - Get today's sales
router.get('/today', authenticateToken, salesController.getTodaySales);

// GET /sales/stats - Get sales statistics
router.get('/stats', authenticateToken, salesController.getStatistics);

// GET /sales/employee/:employeeId - Get sales by employee
router.get('/employee/:employeeId', authenticateToken, salesController.getSalesByEmployee);

// GET /sales/:id - Get sale by ID
router.get('/:id', authenticateToken, validate(saleSchemas.getById), salesController.getSaleById);

// GET /sales/:id/detailed - Get detailed sale with items
router.get('/:id/detailed', authenticateToken, validate(saleSchemas.getById), salesController.getDetailedSale);

// POST /sales - Create new sale
router.post('/', authenticateToken, validate(saleSchemas.create), quickAudit.saleCreate(), salesController.createSale);

// POST /sales/quick-sale - Process quick sale (POS)
router.post('/quick-sale', authenticateToken, validate(saleSchemas.create), quickAudit.saleCreate(), salesController.processQuickSale);

// POST /sales/calculate-total - Calculate sale total
router.post('/calculate-total', authenticateToken, salesController.calculateTotal);

// PUT /sales/:id - Update sale
router.put('/:id', authenticateToken, validate(saleSchemas.update), salesController.updateSale);

// POST /sales/:id/complete - Complete pending sale
router.post('/:id/complete', authenticateToken, salesController.completeSale);

// DELETE /sales/:id - Cancel sale
router.delete('/:id', authenticateToken, salesController.cancelSale);

module.exports = router;
