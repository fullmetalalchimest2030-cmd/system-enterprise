/**
 * Reports Routes - API endpoints for report management
 * @module modules/reports/routes/reportRoutes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');

/**
 * Reports routes:
 * - GET /reports/profitability - Get profitability by period
 * - GET /reports/payment-method - Get sales by payment method
 * - GET /reports/employee - Get sales by employee
 * - GET /reports/waste - Get waste valuation
 * - GET /reports/inventory-turnover - Get inventory turnover
 * - GET /reports/product-performance - Get product performance
 * - GET /reports/comprehensive - Generate comprehensive report
 */

// GET /reports/profitability - Get profitability by period
router.get('/profitability', authenticateToken, authorizeRoles('admin'), reportController.getProfitabilityByPeriod);

// GET /reports/payment-method - Get sales by payment method
router.get('/payment-method', authenticateToken, authorizeRoles('admin'), reportController.getSalesByPaymentMethod);

// GET /reports/employee - Get sales by employee
router.get('/employee', authenticateToken, authorizeRoles('admin'), reportController.getSalesByEmployee);

// GET /reports/waste - Get waste valuation
router.get('/waste', authenticateToken, authorizeRoles('admin'), reportController.getWasteValuation);

// GET /reports/inventory-turnover - Get inventory turnover
router.get('/inventory-turnover', authenticateToken, authorizeRoles('admin'), reportController.getInventoryTurnover);

// GET /reports/product-performance - Get product performance
router.get('/product-performance', authenticateToken, authorizeRoles('admin'), reportController.getProductPerformance);

// GET /reports/forecast - Get AI demand forecast
router.get('/forecast', authenticateToken, authorizeRoles('admin'), reportController.getDemandForecast);

// GET /reports/comprehensive - Generate comprehensive report
router.get('/comprehensive', authenticateToken, authorizeRoles('admin'), reportController.generateComprehensiveReport);

module.exports = router;
