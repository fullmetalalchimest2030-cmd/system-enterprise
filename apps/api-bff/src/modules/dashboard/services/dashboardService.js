/**
 * Dashboard Service - Business logic for dashboard operations
 * @module modules/dashboard/services/dashboardService
 */

const dashboardModel = require('../models/dashboardModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

class DashboardService {
  /**
   * Get daily sales summary
   * @returns {Promise<Object>} Daily sales summary
   */
  async getDailySalesSummary() {
    return await dashboardModel.getDailySalesSummary();
  }

  /**
   * Get monthly sales summary
   * @returns {Promise<Object>} Monthly sales summary
   */
  async getMonthlySalesSummary() {
    return await dashboardModel.getMonthlySalesSummary();
  }

  /**
   * Get monthly profit
   * @param {number} monthOffset - Number of months to go back
   * @returns {Promise<Object>} Monthly profit data
   */
  async getMonthlyProfit(monthOffset = 0) {
    return await dashboardModel.getMonthlyProfit(monthOffset);
  }

  /**
   * Get low stock products
   * @param {number} threshold - Stock threshold
   * @returns {Promise<Array>} Low stock products
   */
  async getLowStockProducts(threshold = 10) {
    return await dashboardModel.getLowStockProducts(threshold);
  }

  /**
   * Get top sellers
   * @param {number} limit - Number of products
   * @returns {Promise<Array>} Top sellers
   */
  async getTopSellers(limit = 5) {
    return await dashboardModel.getTopSellers(limit);
  }

  /**
   * Get bottom sellers
   * @param {number} limit - Number of products
   * @returns {Promise<Array>} Bottom sellers
   */
  async getBottomSellers(limit = 5) {
    return await dashboardModel.getBottomSellers(limit);
  }

  /**
   * Get quick stats
   * @returns {Promise<Object>} Quick stats
   */
  async getQuickStats() {
    return await dashboardModel.getQuickStats();
  }

  /**
   * Get complete dashboard data
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getCompleteDashboard() {
    const [dailySales, monthlySales, monthlyProfit, lowStock, topSellers, bottomSellers, quickStats] = await Promise.all([
      this.getDailySalesSummary(),
      this.getMonthlySalesSummary(),
      this.getMonthlyProfit(0),
      this.getLowStockProducts(),
      this.getTopSellers(5),
      this.getBottomSellers(5),
      this.getQuickStats()
    ]);

    return {
      daily_sales: dailySales,
      monthly_sales: monthlySales,
      monthly_profit: monthlyProfit,
      low_stock_products: lowStock,
      top_sellers: topSellers,
      bottom_sellers: bottomSellers,
      quick_stats: quickStats,
      generated_at: new Date()
    };
  }
}

module.exports = new DashboardService();
