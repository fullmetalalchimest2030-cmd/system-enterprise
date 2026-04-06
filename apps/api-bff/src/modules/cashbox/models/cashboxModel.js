/**
 * Cashbox Model - Turn-based cash control
 * @module modules/cashbox/models/cashboxModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class CashboxModel {
  /**
   * Get all cashbox sessions
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Cashbox sessions
   */
  async findAll(filters = {}) {
    let query = `
      SELECT cb.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM cashboxes cb
      LEFT JOIN users u ON cb.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND cb.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND cb.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND cb.opened_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND cb.opened_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY cb.opened_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get cashbox session by ID
   * @param {number} id - Cashbox ID
   * @returns {Promise<Object>} Cashbox session
   */
  async findById(id) {
    const result = await db.query(`
      SELECT cb.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM cashboxes cb
      LEFT JOIN users u ON cb.user_id = u.id
      WHERE cb.id = $1
    `, [id]);
    return result.rows[0];
  }

  /**
   * Get current open cashbox session
   * @param {number} userId - User ID (optional)
   * @returns {Promise<Object>} Open cashbox session
   */
  async getCurrentOpen(userId) {
    let query = `
      SELECT cb.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM cashboxes cb
      LEFT JOIN users u ON cb.user_id = u.id
      WHERE cb.status = 'open'
    `;
    
    const params = [];
    
    if (userId) {
      query += ` AND cb.user_id = $1`;
      params.push(userId);
    }
    
    query += ` ORDER BY cb.opened_at DESC LIMIT 1`;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Open a new cashbox session
   * @param {Object} cashbox - Cashbox data
   * @returns {Promise<Object>} Created cashbox session
   */
  async create(cashbox) {
    const { user_id, opening_amount } = cashbox;
    
    const result = await db.query(`
      INSERT INTO cashboxes (user_id, opening_amount, status, opened_at)
      VALUES ($1, $2, 'open', NOW())
      RETURNING *
    `, [user_id, opening_amount]);
    return result.rows[0];
  }

  /**
   * Close a cashbox session
   * @param {number} id - Cashbox ID
   * @param {Object} cashbox - Cashbox data
   * @returns {Promise<Object>} Closed cashbox session
   */
  async close(id, cashbox) {
    const { closing_amount } = cashbox;
    
    // Get total expected cash (Cash Payments + Manual Incomes - Manual Expenses)
    const flowResult = await db.query(`
      SELECT COALESCE(SUM(cf.amount), 0) as total 
      FROM cash_flow cf
      LEFT JOIN cash_flow_types cft ON cf.flow_type_id = cft.id
      LEFT JOIN payments p ON cf.reference_table = 'payments' AND cf.reference_id = p.id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE cf.cashbox_id = $1 
      AND (
        (cft.code = 'sale_income' AND pm.code = 'cash') OR 
        (cft.code IN ('income', 'expense', 'opening'))
      )
    `, [id]);
    
    const totalFlow = parseFloat(flowResult.rows[0].total);
    const session = await this.findById(id);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Expected amount is Opening Cash + Net Cash Flow
    const expected_amount = Math.round((parseFloat(session.opening_amount) + totalFlow) * 100) / 100;
    
    // Calculate difference: What we have (closing_amount) vs What we should have (expected_amount)
    let difference = 0;
    if (closing_amount !== undefined && closing_amount !== null) {
      const closingVal = parseFloat(closing_amount);
      difference = Math.round((closingVal - expected_amount) * 100) / 100;
    }
    
    const result = await db.query(`
      UPDATE cashboxes 
      SET closing_amount = $1, 
          expected_amount = $2,
          difference = $3,
          status = 'closed',
          closed_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [closing_amount, expected_amount, difference, id]);
    
    return result.rows[0];
  }

  /**
   * Add cash flow (income or expense)
   * @param {Object} flowData - Flow data
   * @returns {Promise<Object>} Created cash flow
   */
  async addCashFlow(flowData) {
    const { cashbox_id, flow_type_id, reference_table, reference_id, amount } = flowData;
    
    const result = await db.query(`
      INSERT INTO cash_flow (cashbox_id, flow_type_id, reference_table, reference_id, amount, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [cashbox_id, flow_type_id, reference_table, reference_id, amount]);
    return result.rows[0];
  }

  /**
   * Get cash flow for a cashbox
   * @param {number} cashboxId - Cashbox ID
   * @returns {Promise<Array>} Cash flow entries
   */
  async getCashFlow(cashboxId) {
    const result = await db.query(`
      SELECT cf.*, 
             cft.code as flow_type_code,
             pm.code as payment_method_code,
             pm.description as payment_method_name
      FROM cash_flow cf
      LEFT JOIN cash_flow_types cft ON cf.flow_type_id = cft.id
      LEFT JOIN payments p ON cf.reference_table = 'payments' AND cf.reference_id = p.id
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      LEFT JOIN expenses e ON cf.reference_table = 'expenses' AND cf.reference_id = e.id
      WHERE cf.cashbox_id = $1
        AND (cf.reference_table != 'expenses' OR e.deleted_at IS NULL)
      ORDER BY cf.created_at DESC
    `, [cashboxId]);
    return result.rows;
  }
}

module.exports = new CashboxModel();
