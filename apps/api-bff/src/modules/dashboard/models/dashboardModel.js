/**
 * Dashboard Model - Dashboard data and statistics
 * @module modules/dashboard/models/dashboardModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');
const { roundToTenCents } = require('../../../shared/utils/currencyUtils');

class DashboardModel {
  /**
   * Get daily sales summary
   * @returns {Promise<Object>} Daily sales summary
   */
  async getDailySalesSummary() {
    // Today's sales
    const todaySales = await db.query(`
      SELECT 
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as total_amount,
         COALESCE(AVG(total_amount), 0) as average_sale
      FROM sales 
      WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE
    `);

    // Yesterday sales
    const yesterdaySales = await db.query(`
      SELECT 
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as total_amount
      FROM sales 
      WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
    `);

    return {
      today: {
        transactions: parseInt(todaySales.rows[0].transaction_count),
        total: parseFloat(todaySales.rows[0].total_amount),
        average: parseFloat(todaySales.rows[0].average_sale)
      },
      yesterday: {
        transactions: parseInt(yesterdaySales.rows[0].transaction_count),
        total: parseFloat(yesterdaySales.rows[0].total_amount)
      }
    };
  }

  /**
   * Get monthly sales summary
   * @returns {Promise<Object>} Monthly sales summary
   */
  async getMonthlySalesSummary() {
    const currentMonth = await db.query(`
      SELECT 
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as total_amount,
         COALESCE(AVG(total_amount), 0) as average_sale
      FROM sales 
      WHERE status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const lastMonth = await db.query(`
      SELECT 
         COUNT(*) as transaction_count,
         COALESCE(SUM(total_amount), 0) as total_amount
      FROM sales 
      WHERE status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    const currentTotal = parseFloat(currentMonth.rows[0].total_amount);
    const lastTotal = parseFloat(lastMonth.rows[0].total_amount);
    const growth = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    return {
      current_month: {
        transactions: parseInt(currentMonth.rows[0].transaction_count),
        total: currentTotal,
        average: parseFloat(currentMonth.rows[0].average_sale)
      },
      last_month: {
        transactions: parseInt(lastMonth.rows[0].transaction_count),
        total: lastTotal
      },
      growth_percentage: roundToTenCents(growth)
    };
  }

  /**
   * Get monthly profit calculation
   * @returns {Promise<Object>} Monthly profit data
   */
  async getMonthlyProfit() {
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM sales 
      WHERE status = 'completed' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const expensesResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as expenses
      FROM expenses 
      WHERE deleted_at IS NULL AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const expensesByCategory = await db.query(`
      SELECT category, COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE deleted_at IS NULL AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY category
      ORDER BY total DESC
    `);

    const revenue = parseFloat(revenueResult.rows[0].revenue);
    const expenses = parseFloat(expensesResult.rows[0].expenses);
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue: revenue,
      expenses: expenses,
      profit: profit,
      profit_margin: roundToTenCents(profitMargin),
      expenses_by_category: expensesByCategory.rows
    };
  }

  /**
   * Get low stock products list
   * @returns {Promise<Array>} Low stock products
   */
  async getLowStockProducts() {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.stock_cached <= p.min_stock
      ORDER BY p.stock_cached ASC
    `);

    return result.rows;
  }

  /**
   * Get top sellers
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Top selling products
   */
  async getTopSellers(limit = 5) {
    const result = await db.query(`
      SELECT 
         p.id,
         p.name,
         p.sku,
         p.stock_cached,
         p.sell_price,
         c.name as category_name,
         SUM(si.quantity) as units_sold,
         SUM(si.quantity * si.unit_price_at_sale) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed' AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.sku, p.stock_cached, p.sell_price, c.name
      ORDER BY units_sold DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get bottom sellers — products with fewest sales in the last 30 days
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Bottom selling products
   */
  async getBottomSellers(limit = 5) {
    const result = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.stock_cached,
        p.sell_price,
        c.name as category_name,
        COALESCE(SUM(si.quantity), 0) as units_sold,
        COALESCE(SUM(si.quantity * si.unit_price_at_sale), 0) as total_revenue
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id 
        AND s.status = 'completed' 
        AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.sku, p.stock_cached, p.sell_price, c.name
      ORDER BY units_sold ASC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get quick stats for dashboard
   * @returns {Promise<Object>} Quick stats
   */
  async getQuickStats() {
    const productsCount = await db.query(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL
    `);

    const lowStockCount = await db.query(`
      SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL AND stock_cached <= min_stock
    `);

    const usersCount = await db.query(`
      SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL
    `);

    const todayTransactions = await db.query(`
      SELECT COUNT(*) as count FROM sales WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE
    `);

    return {
      active_products: parseInt(productsCount.rows[0].count),
      low_stock_products: parseInt(lowStockCount.rows[0].count),
      active_users: parseInt(usersCount.rows[0].count),
      today_transactions: parseInt(todayTransactions.rows[0].count)
    };
  }
}

module.exports = new DashboardModel();
