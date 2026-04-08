/**
 * Finance Routes - API endpoints for expense management
 * @module modules/finances/routes/financeRoutes
 */

const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { financeSchemas } = require('../../../shared/validation/schemas');

/**
 * Finance routes:
 * - GET /finances - Get all expenses
 * - GET /finances/:id - Get expense by ID
 * - POST /finances - Create new expense
 * - PUT /finances/:id - Update expense
 * - DELETE /finances/:id - Delete expense
 * - GET /finances/summary/category - Get expenses summary by category
 * - GET /finances/daily - Get daily expenses
 * - GET /finances/categories - Get valid categories
 * - GET /finances/payment-methods - Get valid payment methods
 * 
 * Working Capital routes:
 * - GET /finances/working-capital - Get complete working capital report
 * - GET /finances/inventory-value - Get inventory value
 * - GET /finances/waste-value - Get waste value
 * - GET /finances/cash-in-boxes - Get cash in boxes
 * - GET /finances/capital-config - Get capital configuration (admin)
 * - PUT /finances/capital-config - Update capital configuration (admin)
 */

// GET /finances - Get all expenses
router.get('/', authenticateToken, financeController.getAllExpenses);

// GET /finances/summary/category - Get expenses summary by category
router.get('/summary/category', authenticateToken, financeController.getSummaryByCategory);

// GET /finances/daily - Get daily expenses
router.get('/daily', authenticateToken, financeController.getDailyExpenses);

// GET /finances/categories - Get valid categories
router.get('/categories', authenticateToken, financeController.getValidCategories);

// GET /finances/payment-methods - Get valid payment methods
router.get('/payment-methods', authenticateToken, financeController.getValidPaymentMethods);

// ===========================================
// CAPITAL DE TRABAJO (WORKING CAPITAL)
// ===========================================

// GET /finances/working-capital - Get complete working capital report
// @deprecated - Use GET /equity/current-capital instead
router.get('/working-capital', authenticateToken, financeController.getWorkingCapital);

// GET /finances/inventory-value - Get inventory value
router.get('/inventory-value', authenticateToken, financeController.getInventoryValue);

// GET /finances/waste-value - Get waste value for period
router.get('/waste-value', authenticateToken, financeController.getWasteValue);

// GET /finances/cash-in-boxes - Get cash in boxes for period
router.get('/cash-in-boxes', authenticateToken, financeController.getCashInBoxes);

// GET /finances/capital-config - Get capital configuration (admin only)
router.get('/capital-config', authenticateToken, authorizeRoles('admin'), financeController.getCapitalConfig);

// PUT /finances/capital-config - Update capital configuration (admin only)
// @deprecated - Use POST /equity/close instead
router.put('/capital-config', authenticateToken, authorizeRoles('admin'), financeController.updateCapitalConfig);

// ===========================================
// EXPENSE CRUD
// ===========================================

// GET /finances/:id - Get expense by ID
router.get('/:id', authenticateToken, financeController.getExpenseById);

// POST /finances - Create new expense
router.post('/', authenticateToken, validate(financeSchemas.createExpense), financeController.createExpense);

// PUT /finances/:id - Update expense
router.put('/:id', authenticateToken, validate(financeSchemas.updateExpense), financeController.updateExpense);

// DELETE /finances/:id - Delete expense
router.delete('/:id', authenticateToken, authorizeRoles('admin'), financeController.deleteExpense);

module.exports = router;
