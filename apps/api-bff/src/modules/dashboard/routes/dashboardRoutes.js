/**
 * Dashboard Routes - API endpoints for dashboard management
 * @module modules/dashboard/routes/dashboardRoutes
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');

/**
 * Dashboard routes:
 * - GET /dashboard - Get complete dashboard data
 * - GET /dashboard/daily-sales - Get daily sales summary
 * - GET /dashboard/monthly-sales - Get monthly sales summary
 * - GET /dashboard/monthly-profit - Get monthly profit
 * - GET /dashboard/low-stock - Get low stock products
 * - GET /dashboard/top-sellers - Get top sellers
 * - GET /dashboard/bottom-sellers - Get bottom sellers
 * - GET /dashboard/quick-stats - Get quick stats
 */

// GET /dashboard - Get complete dashboard data
router.get('/', authenticateToken, dashboardController.getCompleteDashboard);

// GET /dashboard/daily-sales - Get daily sales summary
router.get('/daily-sales', authenticateToken, dashboardController.getDailySalesSummary);

// GET /dashboard/monthly-sales - Get monthly sales summary
router.get('/monthly-sales', authenticateToken, dashboardController.getMonthlySalesSummary);

// GET /dashboard/monthly-profit - Get monthly profit
router.get('/monthly-profit', authenticateToken, dashboardController.getMonthlyProfit);

// GET /dashboard/low-stock - Get low stock products
router.get('/low-stock', authenticateToken, dashboardController.getLowStockProducts);

// GET /dashboard/top-sellers - Get top sellers
router.get('/top-sellers', authenticateToken, dashboardController.getTopSellers);

// GET /dashboard/bottom-sellers - Get bottom sellers
router.get('/bottom-sellers', authenticateToken, dashboardController.getBottomSellers);

// GET /dashboard/quick-stats - Get quick stats
router.get('/quick-stats', authenticateToken, dashboardController.getQuickStats);

module.exports = router;
