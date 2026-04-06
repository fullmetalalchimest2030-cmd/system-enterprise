/**
 * Cashbox Routes - API endpoints for cashbox management
 * @module modules/cashbox/routes/cashboxRoutes
 */

const express = require('express');
const router = express.Router();
const cashboxController = require('../controllers/cashboxController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { cashboxSchemas } = require('../../../shared/validation/schemas');
const { quickAudit } = require('../../audit/middleware/auditMiddleware');

/**
 * Cashbox routes:
 * - GET /cashbox - Get all cashbox sessions
 * - GET /cashbox/:id - Get cashbox session by ID
 * - GET /cashbox/current - Get current open session
 * - POST /cashbox/open - Open new session
 * - POST /cashbox/:id/close - Close session
 * - POST /cashbox/:cashboxId/income - Add income
 * - POST /cashbox/:cashboxId/expense - Add expense
 * - GET /cashbox/:cashboxId/transactions - Get transactions
 * - GET /cashbox/summary - Get cashbox summary
 * - GET /cashbox/today - Get today's sessions
 * - GET /cashbox/status - Get cashbox status
 * - GET /cashbox/:cashboxId/expected - Calculate expected cash
 */

// GET /cashbox - Get all cashbox sessions
router.get('/', authenticateToken, cashboxController.getAllSessions);

// GET /cashbox/today - Get today's sessions
router.get('/today', authenticateToken, cashboxController.getTodaySessions);

// GET /cashbox/summary - Get cashbox summary
router.get('/summary', authenticateToken, authorizeRoles('admin'), cashboxController.getSummary);

// GET /cashbox/status - Get cashbox status
router.get('/status', authenticateToken, cashboxController.getStatus);

// GET /cashbox/current - Get current open session
router.get('/current', authenticateToken, cashboxController.getCurrentOpenSession);

// GET /cashbox/:id - Get cashbox session by ID
router.get('/:id', authenticateToken, validate(cashboxSchemas.getById), cashboxController.getSessionById);

// GET /cashbox/:cashboxId/transactions - Get transactions
router.get('/:cashboxId/transactions', authenticateToken, cashboxController.getTransactions);

// GET /cashbox/:cashboxId/expected - Calculate expected cash
router.get('/:cashboxId/expected', authenticateToken, cashboxController.calculateExpectedCash);

// POST /cashbox/open - Open new session
router.post('/open', authenticateToken, authorizeRoles('admin', 'cashier'), validate(cashboxSchemas.open), quickAudit.cashboxOpen(), cashboxController.openSession);

// POST /cashbox/:id/close - Close session
router.post('/:id/close', authenticateToken, authorizeRoles('admin', 'cashier'), validate(cashboxSchemas.close), quickAudit.cashboxClose(), cashboxController.closeSession);

// POST /cashbox/:cashboxId/income - Add income
router.post('/:cashboxId/income', authenticateToken, authorizeRoles('admin', 'cashier'), cashboxController.addIncome);

// POST /cashbox/:cashboxId/expense - Add expense
router.post('/:cashboxId/expense', authenticateToken, authorizeRoles('admin', 'cashier'), cashboxController.addExpense);

module.exports = router;
