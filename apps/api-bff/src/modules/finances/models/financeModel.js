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
      query += ` AND e.created_at > $${paramCount}`;
      const startDateObj = this.parseDate(filters.start_date);
      startDateObj.setDate(startDateObj.getDate() + 1);
      params.push(startDateObj.toISOString().split('T')[0]);
      paramCount++;
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

  async create(expense) {
    const { cashbox_id, category, description, amount, user_id } = expense;

    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Valid categories are: ${VALID_CATEGORIES.join(', ')}`);
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO expenses (cashbox_id, category, description, amount, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [cashbox_id, category, description, amount, user_id]);

      const createdExpense = result.rows[0];

      // Register cash flow entry so the cashbox tracks this expense
      if (cashbox_id) {
        const flowTypeResult = await client.query(
          `SELECT id FROM cash_flow_types WHERE code = 'expense' LIMIT 1`
        );
        if (flowTypeResult.rows[0]) {
          await client.query(`
            INSERT INTO cash_flow (cashbox_id, flow_type_id, reference_table, reference_id, amount, created_at)
            VALUES ($1, $2, 'expenses', $3, $4, NOW())
          `, [cashbox_id, flowTypeResult.rows[0].id, createdExpense.id, -Math.abs(amount)]);
        }
      }

      await client.query('COMMIT');
      return createdExpense;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

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

  async delete(id) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      // Soft delete the expense
      const result = await client.query(
        'UPDATE expenses SET deleted_at = NOW() WHERE id = $1',
        [id]
      );
      // Reverse the cash_flow entry so the cashbox balance is corrected
      await client.query(
        `DELETE FROM cash_flow WHERE reference_table = 'expenses' AND reference_id = $1`,
        [id]
      );
      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

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

  async getInventoryValue() {
    const result = await db.query(`
      SELECT COALESCE(SUM(stock_cached * cost_price), 0) as inventory_value
      FROM products
      WHERE deleted_at IS NULL AND stock_cached > 0
    `);
    return parseFloat(result.rows[0].inventory_value) || 0;
  }

  parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  async getWasteValue(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date && filters.end_date) {
      dateFilter += ` AND sm.created_at > $${paramCount}`;
      const startDateObj = this.parseDate(filters.start_date);
      startDateObj.setDate(startDateObj.getDate() + 1);
      params.push(startDateObj.toISOString().split('T')[0]);
      paramCount++;
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
   * Get cash in boxes — includes both closed sessions (closing_amount)
   * and currently open sessions (real-time balance from cash_flow)
   */
  async getCashInBoxes(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND opened_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    } else {
      dateFilter += ` AND opened_at >= NOW() - INTERVAL '30 days'`;
    }

    if (filters.end_date) {
      dateFilter += ` AND opened_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Closed sessions: use the recorded closing_amount
    const closedResult = await db.query(`
      SELECT COALESCE(SUM(closing_amount), 0) as total_cash
      FROM cashboxes
      WHERE status = 'closed'${dateFilter}
    `, params);

    // Open sessions: calculate real-time balance from cash_flow
    const openResult = await db.query(`
      SELECT 
        cb.id,
        cb.opening_amount,
        COALESCE(SUM(cf.amount), 0) as flow_total
      FROM cashboxes cb
      LEFT JOIN cash_flow cf ON cf.cashbox_id = cb.id
      WHERE cb.status = 'open'${dateFilter}
      GROUP BY cb.id, cb.opening_amount
    `, params);

    const closedTotal = parseFloat(closedResult.rows[0].total_cash) || 0;
    const openTotal = openResult.rows.reduce((sum, row) => {
      return sum + parseFloat(row.opening_amount) + parseFloat(row.flow_total);
    }, 0);

    return Math.round((closedTotal + openTotal) * 100) / 100;
  }

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
      paramCount++;
    }

    const result = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE deleted_at IS NULL${dateFilter}
    `, params);

    return parseFloat(result.rows[0].total_expenses) || 0;
  }

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

  async getCapitalConfig() {
    const initialCapital = config.workingCapital.initialCapital;
    return {
      initial_capital: initialCapital,
      has_initial_capital: initialCapital > 0,
      source: 'environment'
    };
  }

  async updateCapitalConfig(initialCapital) {
    return {
      initial_capital: initialCapital,
      message: 'Configure INITIAL_WORKING_CAPITAL in .env file',
      requires_restart: true
    };
  }
}

module.exports = new FinanceModel();
