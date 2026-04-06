/**
 * Dashboard Controller - HTTP layer for dashboard operations
 * @module modules/dashboard/controllers/dashboardController
 */

const dashboardService = require('../services/dashboardService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class DashboardController {
  /**
   * Get daily sales summary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getDailySalesSummary = asyncHandler(async (req, res, next) => {
    const summary = await dashboardService.getDailySalesSummary();
    res.json(successResponse(summary, 'Daily sales summary retrieved successfully'));
  });

  /**
   * Get monthly sales summary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getMonthlySalesSummary = asyncHandler(async (req, res, next) => {
    const summary = await dashboardService.getMonthlySalesSummary();
    res.json(successResponse(summary, 'Monthly sales summary retrieved successfully'));
  });

  /**
   * Get monthly profit
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getMonthlyProfit = asyncHandler(async (req, res, next) => {
    const monthOffset = req.query.month_offset ? parseInt(req.query.month_offset) : 0;
    const profit = await dashboardService.getMonthlyProfit(monthOffset);
    res.json(successResponse(profit, 'Monthly profit retrieved successfully'));
  });

  /**
   * Get low stock products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getLowStockProducts = asyncHandler(async (req, res, next) => {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : 10;
    const products = await dashboardService.getLowStockProducts(threshold);
    res.json(successResponse(products, 'Low stock products retrieved successfully'));
  });

  /**
   * Get top sellers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getTopSellers = asyncHandler(async (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const sellers = await dashboardService.getTopSellers(limit);
    res.json(successResponse(sellers, 'Top sellers retrieved successfully'));
  });

  /**
   * Get bottom sellers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getBottomSellers = asyncHandler(async (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const sellers = await dashboardService.getBottomSellers(limit);
    res.json(successResponse(sellers, 'Bottom sellers retrieved successfully'));
  });

  /**
   * Get quick stats
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getQuickStats = asyncHandler(async (req, res, next) => {
    const stats = await dashboardService.getQuickStats();
    res.json(successResponse(stats, 'Quick stats retrieved successfully'));
  });

  /**
   * Get complete dashboard data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getCompleteDashboard = asyncHandler(async (req, res, next) => {
    const dashboard = await dashboardService.getCompleteDashboard();
    res.json(successResponse(dashboard, 'Dashboard data retrieved successfully'));
  });
}

module.exports = new DashboardController();
