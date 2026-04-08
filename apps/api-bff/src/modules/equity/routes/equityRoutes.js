/**
 * Equity Routes - API endpoints for equity working capital operations
 * @module modules/equity/routes/equityRoutes
 */

const express = require('express');
const router = express.Router();
const equityController = require('../controllers/equityController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');

/**
 * Equity routes:
 * - POST /equity/close       - Close monthly equity period (admin only)
 * - GET  /equity/history     - Get equity history (authenticated)
 * - GET  /equity/current-capital - Get current working capital (authenticated)
 */

// POST /equity/close - Close monthly equity period (admin only)
router.post('/close', authenticateToken, authorizeRoles('admin'), equityController.closeMonth);

// GET /equity/history - Get equity history
router.get('/history', authenticateToken, equityController.getHistory);

// GET /equity/current-capital - Get current working capital
router.get('/current-capital', authenticateToken, equityController.getCurrentCapital);

module.exports = router;
