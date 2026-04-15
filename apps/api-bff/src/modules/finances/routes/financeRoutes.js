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
 * Capital de trabajo → ver módulo equity (/api/v1/equity)
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
