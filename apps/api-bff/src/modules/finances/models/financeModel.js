/**
 * Finance Model - Expense tracking
 * @module modules/finances/models/financeModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');
const { roundToTenCents } = require('../../../shared/utils/currencyUtils');
const config = require('../../../config');

const VALID_CATEGORIES = ['flowers', 'services', 'transport', 'salaries', 'utilities', 'supplies', 'other'];

class FinanceModel {
  /**
   * Get all expenses
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Expenses array
   */
  async findAll(filters = {}) {
    let query = `
      SELECT e.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name,
             cb.id as cashbox_id
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN cashboxes cb ON e.cashbox_id = cb.id
      WHERE e.deleted_at IS NULL
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND e.category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.cashbox_id) {
      query += ` AND e.cashbox_id = $${paramCount}`;
      params.push(filters.cashbox_id);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND e.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.start_date && filters.end_date) {
      // start_date: usar > con el día siguiente para ser inclusivo
      query += ` AND e.created_at > $${paramCount}`;
      const startDateObj = this.parseDate(filters.start_date);
      startDateObj.setDate(startDateObj.getDate() + 1);
      params.push(startDateObj.toISOString().split('T')[0]);
      paramCount++;
      // end_date: usar < con el día siguiente para incluir todo el día final
      query += ` AND e.created_at < $${paramCount}`;
      const endDateObj = this.parseDate(filters.end_date);
      endDateObj.setDate(endDateObj.getDate() + 1);
      params.push(endDateObj.toISOString().split('T')[0]);
      paramCount++;
    } else if (filters.start_date) {
      query += ` AND e.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    } else if (filters.end_date) {
      // Si solo hay end_date, usar < con el día siguiente
      query += ` AND e.created_at < $${paramCount}`;
      const endDateObj = this.parseDate(filters.end_date);
      endDateObj.setDate(endDateObj.getDate() + 1);
      params.push(endDateObj.toISOString().split('T')[0]);
      paramCount++;
    }

    query += ` ORDER BY e.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get expense by ID
   * @param {number} id - Expense ID
   * @returns {Promise<Object>} Expense object
   */
  async findById(id) {
    const result = await db.query(`
      SELECT e.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.id = $1 AND e.deleted_at IS NULL
    `, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create a new expense
   * @param {Object} expense - Expense data
   * @returns {Promise<Object>} Created expense
   */
  async create(expense) {
    const { cashbox_id, category, description, amount, user_id } = expense;
    
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Valid categories are: ${VALID_CATEGORIES.join(', ')}`);
    }

    const result = await db.query(`
      INSERT INTO expenses (cashbox_id, category, description, amount, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [cashbox_id, category, description, amount, user_id]);
    
    return result.rows[0];
  }

  /**
   * Update an expense
   * @param {number} id - Expense ID
   * @param {Object} expense - Expense data to update
   * @returns {Promise<Object>} Updated expense
   */
  async update(id, expense) {
    const { category, description, amount } = expense;
    
    const result = await db.query(`
      UPDATE expenses 
      SET category = COALESCE($1, category),
          description = COALESCE($2, description),
          amount = COALESCE($3, amount)
      WHERE id = $4 AND deleted_at IS NULL
      RETURNING *
    `, [category, description, amount, id]);
    
    return result.rows[0];
  }

  /**
   * Delete an expense (soft delete)
   * @param {number} id - Expense ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const result = await db.query(
      'UPDATE expenses SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get expenses summary by category
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Expenses summary
   */
  async getSummaryByCategory(filters = {}) {
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

    const result = await db.query(`
      SELECT category, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE deleted_at IS NULL${dateFilter}
      GROUP BY category
      ORDER BY total DESC
    `, params);

    const totalResult = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as total_count
      FROM expenses 
      WHERE deleted_at IS NULL${dateFilter}
    `, params);

    return {
      by_category: result.rows,
      summary: {
        total_expenses: parseFloat(totalResult.rows[0].total_expenses),
        total_count: parseInt(totalResult.rows[0].total_count)
      }
    };
  }

  /**
   * Get daily expenses (last 30 days by default)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Daily expenses
   */
  async getDailyExpenses(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    } else {
      dateFilter += ` AND created_at >= NOW() - INTERVAL '30 days'`;
    }

    if (filters.end_date) {
      dateFilter += ` AND created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    const result = await db.query(`
      SELECT 
        DATE(created_at) as date, 
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(*) as count
      FROM expenses 
      WHERE deleted_at IS NULL${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, params);

    return result.rows;
  }

  // ===========================================
  // CAPITAL DE TRABAJO (WORKING CAPITAL)
  // ===========================================

  /**
   * Get inventory value (products * cost_price)
   * @returns {Promise<number>} Total inventory value
   */
  async getInventoryValue() {
    const result = await db.query(`
      SELECT COALESCE(SUM(stock_cached * cost_price), 0) as inventory_value
      FROM products
      WHERE deleted_at IS NULL AND stock_cached > 0
    `);
    return parseFloat(result.rows[0].inventory_value) || 0;
  }

  /**
   * Parse date string to Date object correctly
   * @param {string} dateStr - Date string in format YYYY-MM-DD
   * @returns {Date} Parsed Date object
   */
  parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Get waste value for a period
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total waste value
   */
  async getWasteValue(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date && filters.end_date) {
      // start_date: usar > con el día siguiente para ser inclusivo
      dateFilter += ` AND sm.created_at > $${paramCount}`;
      const startDateObj = this.parseDate(filters.start_date);
      startDateObj.setDate(startDateObj.getDate() + 1);
      params.push(startDateObj.toISOString().split('T')[0]);
      paramCount++;
      // end_date: usar < con el día siguiente para incluir todo el día final
      dateFilter += ` AND sm.created_at < $${paramCount}`;
      const endDateObj = this.parseDate(filters.end_date);
      endDateObj.setDate(endDateObj.getDate() + 1);
      params.push(endDateObj.toISOString().split('T')[0]);
    }

    const result = await db.query(`
      SELECT COALESCE(SUM(ABS(sm.quantity) * p.cost_price), 0) as waste_value
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.movement_type_id = 3${dateFilter}
    `, params);

    return parseFloat(result.rows[0].waste_value) || 0;
  }

  /**
   * Get cash in boxes (closed boxes in period)
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total cash in boxes
   */
  async getCashInBoxes(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND closed_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    } else {
      dateFilter += ` AND closed_at >= NOW() - INTERVAL '30 days'`;
    }

    if (filters.end_date) {
      dateFilter += ` AND closed_at <= $${paramCount}`;
      params.push(filters.end_date);
    }

    const result = await db.query(`
      SELECT COALESCE(SUM(closing_amount), 0) as total_cash
      FROM cashboxes
      WHERE status = 'closed'${dateFilter}
    `, params);

    return parseFloat(result.rows[0].total_cash) || 0;
  }

  /**
   * Get total expenses for a period
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total expenses
   */
  async getTotalExpenses(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    } else {
      dateFilter += ` AND created_at >= NOW() - INTERVAL '30 days'`;
    }

    if (filters.end_date) {
      dateFilter += ` AND created_at <= $${paramCount}`;
      params.push(filters.end_date);
    }

    const result = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE deleted_at IS NULL${dateFilter}
    `, params);

    return parseFloat(result.rows[0].total_expenses) || 0;
  }

  /**
   * Get complete working capital report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Working capital data
   */
  async getWorkingCapital(filters = {}) {
    const [inventoryValue, wasteValue, cashInBoxes, totalExpenses] = await Promise.all([
      this.getInventoryValue(),
      this.getWasteValue(filters),
      this.getCashInBoxes(filters),
      this.getTotalExpenses(filters)
    ]);

    const initialCapital = config.workingCapital.initialCapital;
    const netInventory = inventoryValue - wasteValue;
    const workingCapital = initialCapital + netInventory + cashInBoxes - totalExpenses;

    let status = 'critical';
    let statusLabel = 'Crítico';
    let statusColor = 'red';

    if (workingCapital > 0) {
      const ratio = workingCapital / (totalExpenses || 1);
      if (ratio >= 1) {
        status = 'solid';
        statusLabel = 'Sólido';
        statusColor = 'green';
      } else if (ratio >= 0.3) {
        status = 'warning';
        statusLabel = 'Advertencia';
        statusColor = 'yellow';
      } else {
        status = 'low';
        statusLabel = 'Bajo';
        statusColor = 'orange';
      }
    }

    return {
      period: {
        start_date: filters.start_date || null,
        end_date: filters.end_date || null
      },
      components: {
        initial_capital: initialCapital,
        inventory_gross: inventoryValue,
        waste_deductions: wasteValue,
        inventory_net: netInventory,
        cash_in_boxes: cashInBoxes,
        total_expenses: totalExpenses
      },
      working_capital: roundToTenCents(workingCapital),
      status: status,
      status_label: statusLabel,
      status_color: statusColor
    };
  }

  /**
   * Get or create capital configuration
   * @returns {Promise<Object>} Capital configuration
   */
  async getCapitalConfig() {
    const initialCapital = config.workingCapital.initialCapital;
    
    return {
      initial_capital: initialCapital,
      has_initial_capital: initialCapital > 0,
      source: 'environment'
    };
  }

  /**
   * Update capital configuration
   * @param {number} initialCapital - New initial capital value
   * @returns {Promise<Object>} Updated config
   */
  async updateCapitalConfig(initialCapital) {
    return {
      initial_capital: initialCapital,
      message: 'Configure INITIAL_WORKING_CAPITAL in .env file',
      requires_restart: true
    };
  }
}

module.exports = new FinanceModel();
