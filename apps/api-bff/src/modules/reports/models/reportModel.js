/**
 * Reports Model - Business intelligence and reporting
 * @module modules/reports/models/reportModel
 */

const db = require('../../../config/database');
const { roundToTenCents } = require('../../../shared/utils/currencyUtils');

class ReportModel {
  /**
   * Get profitability report by period
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Profitability data
   */
  async getProfitabilityByPeriod(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND s.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND s.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Total sales revenue
    const salesResult = await db.query(
      `SELECT COALESCE(SUM(s.total_amount), 0) as total_revenue
       FROM sales s
       WHERE s.status = 'completed'${dateFilter}`,
      params
    );

    // Total expenses
    const expensesResult = await db.query(
      `SELECT COALESCE(SUM(e.amount), 0) as total_expenses
       FROM expenses e
       WHERE e.deleted_at IS NULL${dateFilter.replace(/s\.created_at/g, 'e.created_at')}`,
      params
    );

    // Calculate profit
    const revenue = parseFloat(salesResult.rows[0].total_revenue);
    const expenses = parseFloat(expensesResult.rows[0].total_expenses);
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Monthly breakdown
    const monthlyResult = await db.query(
      `SELECT 
         DATE_TRUNC('month', s.created_at) as month,
         COALESCE(SUM(s.total_amount), 0) as revenue
       FROM sales s
       WHERE s.status = 'completed'${dateFilter}
       GROUP BY DATE_TRUNC('month', s.created_at)
       ORDER BY month DESC`,
      params
    );

    // Get expenses by month
    const expensesMonthlyResult = await db.query(
      `SELECT 
         DATE_TRUNC('month', e.created_at) as month,
         COALESCE(SUM(e.amount), 0) as expenses
       FROM expenses e
       WHERE e.deleted_at IS NULL${dateFilter.replace(/s\.created_at/g, 'e.created_at')}
       GROUP BY DATE_TRUNC('month', e.created_at)
       ORDER BY month DESC`,
      params
    );

    // Merge revenue and expenses by month
    const monthlyData = monthlyResult.rows.map(m => {
      const monthExpenses = expensesMonthlyResult.rows.find(e => 
        e.month.getTime() === m.month.getTime()
      );
      return {
        month: m.month,
        revenue: parseFloat(m.revenue),
        expenses: monthExpenses ? parseFloat(monthExpenses.expenses) : 0,
        profit: parseFloat(m.revenue) - (monthExpenses ? parseFloat(monthExpenses.expenses) : 0)
      };
    });

    return {
      summary: {
        total_revenue: revenue,
        total_expenses: expenses,
        profit: profit,
        profit_margin: roundToTenCents(profitMargin)
      },
      by_month: monthlyData,
      raw_sales: monthlyResult.rows,
      raw_expenses: expensesMonthlyResult.rows
    };
  }

  /**
   * Get sales history for forecasting
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Sales history
   */
  async getSalesHistory(filters = {}) {
    const result = await db.query(`
      SELECT DATE(created_at) as date, SUM(total_amount) as amount, COUNT(*) as quantity
      FROM sales
      WHERE status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT $1
    `, [filters.limit || 100]);
    return result.rows;
  }

  /**
   * Get sales by payment method
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Sales by payment method
   */
  async getSalesByPaymentMethod(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND s.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND s.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    const result = await db.query(
      `SELECT 
         pm.code as payment_method, 
         COUNT(s.id) as transaction_count, 
         COALESCE(SUM(s.total_amount), 0) as total_amount,
         COALESCE(AVG(s.total_amount), 0) as average_amount
       FROM sales s
       JOIN payments p ON s.id = p.sale_id
       JOIN payment_methods pm ON p.payment_method_id = pm.id
       WHERE s.status = 'completed'${dateFilter}
       GROUP BY pm.code
       ORDER BY total_amount DESC`,
      params
    );

    // Get total
    const totalResult = await db.query(
      `SELECT COUNT(*) as total_transactions, COALESCE(SUM(total_amount), 0) as total_amount
       FROM sales s
       WHERE s.status = 'completed'${dateFilter}`,
      params
    );

    return {
      by_payment_method: result.rows,
      summary: {
        total_transactions: parseInt(totalResult.rows[0].total_transactions),
        total_amount: parseFloat(totalResult.rows[0].total_amount)
      }
    };
  }

  /**
   * Get sales by employee
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Sales by employee
   */
  async getSalesByEmployee(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND s.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND s.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    if (filters.user_id) {
      dateFilter += ` AND s.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    const result = await db.query(
      `SELECT 
         s.user_id,
         u.first_name,
         u.last_name,
         COUNT(*) as transaction_count, 
         COALESCE(SUM(s.total_amount), 0) as total_amount,
         COALESCE(AVG(s.total_amount), 0) as average_amount
       FROM sales s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'completed'${dateFilter}
       GROUP BY s.user_id, u.first_name, u.last_name
       ORDER BY total_amount DESC`,
      params
    );

    // Get total
    const totalResult = await db.query(
      `SELECT COUNT(*) as total_transactions, COALESCE(SUM(total_amount), 0) as total_amount
       FROM sales s
       WHERE s.status = 'completed'${dateFilter}`,
      params
    );

    return {
      by_employee: result.rows,
      summary: {
        total_transactions: parseInt(totalResult.rows[0].total_transactions),
        total_amount: parseFloat(totalResult.rows[0].total_amount)
      }
    };
  }

  /**
   * Get waste valuation report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Waste valuation data
   */
  async getWasteValuation(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Get waste movements from inventory
    const wasteResult = await db.query(
      `SELECT 
         sm.product_id,
         p.name as product_name,
         p.sell_price,
         p.cost_price,
         SUM(ABS(sm.quantity)) as wasted_quantity,
         SUM(ABS(sm.quantity) * p.cost_price) as cost_value,
         SUM(ABS(sm.quantity) * p.sell_price) as retail_value
       FROM stock_movements sm
       JOIN products p ON sm.product_id = p.id
       JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
       WHERE smt.code = 'waste'${dateFilter.replace(/created_at/g, 'sm.created_at')}
       GROUP BY sm.product_id, p.name, p.sell_price, p.cost_price
       ORDER BY retail_value DESC`,
      params
    );

    // Get total waste
    const totalResult = await db.query(
      `SELECT 
         COUNT(*) as waste_count,
         COALESCE(SUM(ABS(sm.quantity)), 0) as total_wasted_items
       FROM stock_movements sm
       JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
       WHERE smt.code = 'waste'${dateFilter.replace(/created_at/g, 'sm.created_at')}`,
      params
    );

    // Calculate totals
    let totalCostValue = 0;
    let totalRetailValue = 0;
    wasteResult.rows.forEach(row => {
      totalCostValue += parseFloat(row.cost_value);
      totalRetailValue += parseFloat(row.retail_value);
    });

    return {
      by_product: wasteResult.rows,
      summary: {
        waste_count: parseInt(totalResult.rows[0].waste_count),
        total_wasted_items: parseInt(totalResult.rows[0].total_wasted_items),
        total_cost_value: totalCostValue,
        total_retail_value: totalRetailValue
      }
    };
  }

  /**
   * Get inventory turnover report
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Inventory turnover data
   */
  async getInventoryTurnover(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND sm.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND sm.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    const result = await db.query(
      `SELECT 
         p.id as product_id,
         p.name as product_name,
         p.stock_cached as current_stock,
         p.cost_price,
         p.sell_price,
         COALESCE(SUM(CASE WHEN smt.code = 'sale' OR sm.quantity < 0 THEN ABS(sm.quantity) ELSE 0 END), 0) as units_sold,
         COALESCE(SUM(CASE WHEN smt.code = 'purchase' OR sm.quantity > 0 THEN sm.quantity ELSE 0 END), 0) as units_received
       FROM products p
       LEFT JOIN stock_movements sm ON p.id = sm.product_id${dateFilter}
       LEFT JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
       GROUP BY p.id, p.name, p.stock_cached, p.cost_price, p.sell_price
       ORDER BY units_sold DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Get top and bottom selling products with enhanced metrics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Top and bottom sellers with summary, category performance, and alerts
   */
  async getProductPerformance(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND s.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND s.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    const limit = filters.limit || 10;

    // Get all products with sales data for the period
    const allProductsResult = await db.query(
      `SELECT 
         p.id as product_id,
         p.name as product_name,
         p.category_id,
         c.name as category_name,
         p.cost_price,
         p.sell_price,
         p.stock_cached as current_stock,
         COALESCE(SUM(si.quantity), 0) as units_sold,
         COALESCE(SUM(si.quantity * si.unit_price_at_sale), 0) as total_revenue,
         COUNT(DISTINCT s.id) as transactions_count
       FROM products p
       LEFT JOIN sale_items si ON p.id = si.product_id
       LEFT JOIN sales s ON si.sale_id = s.id AND s.status = 'completed'${dateFilter}
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.deleted_at IS NULL
       GROUP BY p.id, p.name, p.category_id, c.name, p.cost_price, p.sell_price, p.stock_cached
       ORDER BY units_sold DESC`,
      params
    );

    // Calculate totals
    let totalUnitsSold = 0;
    let totalRevenue = 0;
    let totalTransactions = 0;
    let productsWithSales = 0;

    allProductsResult.rows.forEach(row => {
      const units = parseFloat(row.units_sold) || 0;
      const revenue = parseFloat(row.total_revenue) || 0;
      const transactions = parseInt(row.transactions_count) || 0;
      
      totalUnitsSold += units;
      totalRevenue += revenue;
      totalTransactions += transactions;
      
      if (units > 0) {
        productsWithSales++;
      }
    });

    // Get top sellers (products with sales)
    const topSellers = allProductsResult.rows
      .filter(row => parseFloat(row.units_sold) > 0)
      .slice(0, limit)
      .map(row => {
        const unitsSold = parseFloat(row.units_sold) || 0;
        const totalRevenueProduct = parseFloat(row.total_revenue) || 0;
        const costPrice = parseFloat(row.cost_price) || 0;
        const sellPrice = parseFloat(row.sell_price) || 0;
        const transactionsCount = parseInt(row.transactions_count) || 0;
        
        // Calculate metrics
        const averagePrice = unitsSold > 0 ? totalRevenueProduct / unitsSold : 0;
        const percentageOfTotalRevenue = totalRevenue > 0 ? (totalRevenueProduct / totalRevenue) * 100 : 0;
        const percentageOfTotalUnits = totalUnitsSold > 0 ? (unitsSold / totalUnitsSold) * 100 : 0;
        
        // Calculate profit margin (if cost_price is available)
        let profitMargin = 0;
        if (costPrice > 0 && sellPrice > 0) {
          profitMargin = ((sellPrice - costPrice) / sellPrice) * 100;
        }
        
        return {
          product_id: row.product_id,
          product_name: row.product_name,
          category_id: row.category_id,
          category_name: row.category_name,
          units_sold: unitsSold,
          total_revenue: roundToTenCents(totalRevenueProduct),
          average_price: roundToTenCents(averagePrice),
          percentage_of_total_revenue: roundToTenCents(percentageOfTotalRevenue),
          percentage_of_total_units: roundToTenCents(percentageOfTotalUnits),
          profit_margin: roundToTenCents(profitMargin),
          transactions_count: transactionsCount,
          current_stock: parseInt(row.current_stock) || 0
        };
      });

    // Get bottom sellers (products with least sales, including zero)
    const bottomSellers = allProductsResult.rows
      .slice(-limit)
      .reverse()
      .map(row => {
        const unitsSold = parseFloat(row.units_sold) || 0;
        const totalRevenueProduct = parseFloat(row.total_revenue) || 0;
        const costPrice = parseFloat(row.cost_price) || 0;
        const sellPrice = parseFloat(row.sell_price) || 0;
        const transactionsCount = parseInt(row.transactions_count) || 0;
        
        // Calculate metrics
        const averagePrice = unitsSold > 0 ? totalRevenueProduct / unitsSold : 0;
        const percentageOfTotalRevenue = totalRevenue > 0 ? (totalRevenueProduct / totalRevenue) * 100 : 0;
        const percentageOfTotalUnits = totalUnitsSold > 0 ? (unitsSold / totalUnitsSold) * 100 : 0;
        
        // Calculate profit margin
        let profitMargin = 0;
        if (costPrice > 0 && sellPrice > 0) {
          profitMargin = ((sellPrice - costPrice) / sellPrice) * 100;
        }
        
        // Add alert for products with no sales
        let alert = null;
        if (unitsSold === 0) {
          alert = 'Sin ventas en el período';
        } else if (unitsSold <= 2) {
          alert = 'Ventas muy bajas';
        }
        
        return {
          product_id: row.product_id,
          product_name: row.product_name,
          category_id: row.category_id,
          category_name: row.category_name,
          units_sold: unitsSold,
          total_revenue: roundToTenCents(totalRevenueProduct),
          average_price: roundToTenCents(averagePrice),
          percentage_of_total_revenue: roundToTenCents(percentageOfTotalRevenue),
          percentage_of_total_units: roundToTenCents(percentageOfTotalUnits),
          profit_margin: roundToTenCents(profitMargin),
          transactions_count: transactionsCount,
          current_stock: parseInt(row.current_stock) || 0,
          alert
        };
      });

    // Get category performance
    const categoryPerformanceResult = await db.query(
      `SELECT 
         c.id as category_id,
         c.name as category_name,
         COUNT(DISTINCT p.id) as products_count,
         COALESCE(SUM(si.quantity), 0) as total_units_sold,
         COALESCE(SUM(si.quantity * si.unit_price_at_sale), 0) as total_revenue
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
       LEFT JOIN sale_items si ON p.id = si.product_id
       LEFT JOIN sales s ON si.sale_id = s.id AND s.status = 'completed'${dateFilter}
       WHERE c.deleted_at IS NULL
       GROUP BY c.id, c.name
       HAVING COALESCE(SUM(si.quantity), 0) > 0
       ORDER BY total_revenue DESC`,
      params
    );

    const categoryPerformance = categoryPerformanceResult.rows.map(row => {
      const totalUnitsSoldCat = parseFloat(row.total_units_sold) || 0;
      const totalRevenueCat = parseFloat(row.total_revenue) || 0;
      const productsCount = parseInt(row.products_count) || 0;
      
      return {
        category_id: row.category_id,
        category_name: row.category_name,
        products_count: productsCount,
        total_units_sold: totalUnitsSoldCat,
        total_revenue: roundToTenCents(totalRevenueCat),
        average_revenue_per_product: productsCount > 0 ? roundToTenCents(totalRevenueCat / productsCount) : 0
      };
    });

    // Generate alerts
    const alerts = [];
    
    // Alert for top seller with low stock
    if (topSellers.length > 0 && topSellers[0].current_stock < 10) {
      alerts.push({
        type: 'low_stock',
        product_id: topSellers[0].product_id,
        product_name: topSellers[0].product_name,
        current_stock: topSellers[0].current_stock,
        message: 'Stock bajo para producto más vendido'
      });
    }
    
    // Alert for products with no sales
    const noSalesProducts = bottomSellers.filter(p => p.units_sold === 0);
    if (noSalesProducts.length > 0) {
      alerts.push({
        type: 'no_sales',
        count: noSalesProducts.length,
        products: noSalesProducts.slice(0, 3).map(p => ({
          product_id: p.product_id,
          product_name: p.product_name
        })),
        message: `${noSalesProducts.length} producto(s) sin ventas en el período`
      });
    }

    // Alert for products with very low sales
    const lowSalesProducts = bottomSellers.filter(p => p.units_sold > 0 && p.units_sold <= 2);
    if (lowSalesProducts.length > 0) {
      alerts.push({
        type: 'low_sales',
        count: lowSalesProducts.length,
        products: lowSalesProducts.slice(0, 3).map(p => ({
          product_id: p.product_id,
          product_name: p.product_name,
          units_sold: p.units_sold
        })),
        message: `${lowSalesProducts.length} producto(s) con ventas muy bajas`
      });
    }

    return {
      summary: {
        period: {
          start_date: filters.start_date || null,
          end_date: filters.end_date || null
        },
        totals: {
          total_units_sold: roundToTenCents(totalUnitsSold),
          total_revenue: roundToTenCents(totalRevenue),
          total_products_sold: productsWithSales,
          total_products: allProductsResult.rows.length,
          total_transactions: totalTransactions,
          average_price_per_unit: totalUnitsSold > 0 ? roundToTenCents(totalRevenue / totalUnitsSold) : 0
        }
      },
      top_sellers: topSellers,
      bottom_sellers: bottomSellers,
      category_performance: categoryPerformance,
      alerts: alerts
    };
  }
}

module.exports = new ReportModel();

