/**
 * Cashbox Service - Business logic for cashbox operations
 * @module modules/cashbox/services/cashboxService
 */

const cashboxModel = require('../models/cashboxModel');
const salesModel = require('../../sales/models/salesModel');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { roundToTenCents } = require('../../../shared/utils/currencyUtils');

class CashboxService {
  /**
   * Get all cashbox sessions with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Cashbox sessions
   */
  async getAllSessions(filters) {
    return await cashboxModel.findAll(filters);
  }

  /**
   * Get cashbox session by ID
   * @param {number} id - Cashbox ID
   * @returns {Promise<Object>} Cashbox session
   */
  async getSessionById(id) {
    const session = await cashboxModel.findById(id);
    if (!session) {
      throw new AppError('Cashbox session not found', 404);
    }
    return session;
  }

  /**
   * Get current open cashbox session
   * @param {number} employeeId - Employee ID (optional)
   * @returns {Promise<Object>} Open cashbox session
   */
  async getCurrentOpenSession(employeeId) {
    return await cashboxModel.getCurrentOpen(employeeId);
  }

  /**
   * Open a new cashbox session
   * @param {Object} cashboxData - Cashbox data
   * @returns {Promise<Object>} Created cashbox session
   */
  async openSession(cashboxData) {
    const { user_id, opening_amount } = cashboxData;

    // Validate required fields
    if (!user_id || opening_amount === undefined) {
      throw new AppError('User ID and opening amount are required', 400);
    }

    // Check if there's already an open session
    const openSession = await cashboxModel.getCurrentOpen(user_id);
    if (openSession) {
      throw new AppError('There is already an open cashbox session for this user', 400);
    }

    // Validate opening amount
    if (opening_amount < 0) {
      throw new AppError('Opening amount cannot be negative', 400);
    }

    return await cashboxModel.create({
      user_id,
      opening_amount
    });
  }

  /**
   * Close a cashbox session
   * @param {number} id - Cashbox ID
   * @param {Object} cashboxData - Cashbox data
   * @returns {Promise<Object>} Closed cashbox session
   */
  async closeSession(id, cashboxData) {
    const { closing_amount } = cashboxData;

    // Validate required fields
    if (closing_amount === undefined) {
      throw new AppError('Closing amount is required', 400);
    }

    const session = await cashboxModel.findById(id);
    if (!session) {
      throw new AppError('Cashbox session not found', 404);
    }

    if (session.status === 'closed') {
      throw new AppError('Cashbox session is already closed', 400);
    }

    // Validate closing amount
    if (closing_amount < 0) {
      throw new AppError('Closing amount cannot be negative', 400);
    }

    return await cashboxModel.close(id, {
      closing_amount
    });
  }

  /**
   * Add cash flow to cashbox
   * @param {number} cashboxId - Cashbox ID
   * @param {Object} flowData - Flow data
   * @returns {Promise<Object>} Created cash flow
   */
  async addCashFlow(cashboxId, flowData) {
    const { flow_type_id, reference_table, reference_id, amount } = flowData;

    // Validate required fields
    if (!flow_type_id || !amount) {
      throw new AppError('Flow type ID and amount are required', 400);
    }

    // Check if cashbox is open
    const session = await cashboxModel.findById(cashboxId);
    if (!session) {
      throw new AppError('Cashbox session not found', 404);
    }

    if (session.status === 'closed') {
      throw new AppError('Cannot add cash flow to a closed cashbox', 400);
    }

    return await cashboxModel.addCashFlow({
      cashbox_id: cashboxId,
      flow_type_id,
      reference_table,
      reference_id,
      amount
    });
  }

  /**
   * Get cash flow for a cashbox
   * @param {number} cashboxId - Cashbox ID
   * @returns {Promise<Array>} Cash flow entries
   */
  async getCashFlow(cashboxId) {
    const session = await cashboxModel.findById(cashboxId);
    if (!session) {
      throw new AppError('Cashbox session not found', 404);
    }

    return await cashboxModel.getCashFlow(cashboxId);
  }

  /**
   * Get cashbox status (current session info)
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Cashbox status
   */
  async getStatus(userId) {
    const openSession = await cashboxModel.getCurrentOpen(userId);
    
    if (openSession) {
      // Get cash flow for this session
      const cashFlow = await cashboxModel.getCashFlow(openSession.id);
      
      // We only consider 'cash' for the physical balance
      const totalIncome = cashFlow
        .filter(flow => (flow.flow_type_code === 'sale_income' && flow.payment_method_code === 'cash') || 
                        (flow.flow_type_code === 'income' || flow.flow_type_code === 'opening'))
        .reduce((sum, flow) => sum + parseFloat(flow.amount), 0);
      
      const totalExpenses = cashFlow
        .filter(flow => flow.flow_type_code === 'expense')
        .reduce((sum, flow) => sum + Math.abs(parseFloat(flow.amount)), 0);
      
      const currentBalance = roundToTenCents(parseFloat(openSession.opening_amount) + totalIncome - totalExpenses);

      // Dynamically add the real-time expected amount to the session object for frontend consistency
      const sessionWithRealtimeData = {
        ...openSession,
        expected_amount: currentBalance,
      };

      return {
        status: 'open',
        session: sessionWithRealtimeData,
        total_income: roundToTenCents(totalIncome),
        total_expenses: roundToTenCents(totalExpenses),
        current_balance: currentBalance
      };
    }
    
    return {
      status: 'closed',
      session: null
    };
  }

  /**
   * Calculate expected cash for a session
   * @param {number} cashboxId - Cashbox ID
   * @returns {Promise<Object>} Expected cash calculation
   */
  async calculateExpectedCash(cashboxId) {
    const session = await cashboxModel.findById(cashboxId);
    if (!session) {
      throw new AppError('Cashbox session not found', 404);
    }

    // Get cash flow for this session
    const cashFlow = await cashboxModel.getCashFlow(cashboxId);
    
    // Physical cash expected: Only cash payments + manual incomes - expenses
    const totalIncome = cashFlow
      .filter(flow => (flow.flow_type_code === 'sale_income' && flow.payment_method_code === 'cash') || 
                      (flow.flow_type_code === 'income' || flow.flow_type_code === 'opening'))
      .reduce((sum, flow) => sum + parseFloat(flow.amount), 0);
    
    const totalExpenses = cashFlow
      .filter(flow => flow.flow_type_code === 'expense')
      .reduce((sum, flow) => sum + Math.abs(parseFloat(flow.amount)), 0);

    // Calculate expected cash
    const expectedCash = roundToTenCents(parseFloat(session.opening_amount) + totalIncome - totalExpenses);

    return {
      opening_amount: parseFloat(session.opening_amount),
      total_income: roundToTenCents(totalIncome),
      total_expenses: roundToTenCents(totalExpenses),
      expected_cash: expectedCash,
      actual_cash: session.closing_amount ? parseFloat(session.closing_amount) : null,
      difference: session.difference ? parseFloat(session.difference) : null
    };
  }

  /**
   * Add income to cashbox
   * @param {number} cashboxId - Cashbox ID
   * @param {Object} incomeData - Income data
   * @returns {Promise<Object>} Created income flow
   */
  async addIncome(cashboxId, incomeData) {
    const { amount, description, reference_table, reference_id } = incomeData;

    // Get income flow type
    const db = require('../../../config/database');
    const flowTypeResult = await db.query(`SELECT id FROM cash_flow_types WHERE code = 'income'`);
    
    if (!flowTypeResult.rows[0]) {
      throw new AppError('Income flow type not found', 500);
    }

    return await this.addCashFlow(cashboxId, {
      flow_type_id: flowTypeResult.rows[0].id,
      reference_table,
      reference_id,
      amount: Math.abs(amount) // Ensure positive
    });
  }

  /**
   * Add expense to cashbox
   * @param {number} cashboxId - Cashbox ID
   * @param {Object} expenseData - Expense data
   * @returns {Promise<Object>} Created expense flow
   */
  async addExpense(cashboxId, expenseData) {
    const { amount, description, reference_table, reference_id } = expenseData;

    // Get expense flow type
    const db = require('../../../config/database');
    const flowTypeResult = await db.query(`SELECT id FROM cash_flow_types WHERE code = 'expense'`);
    
    if (!flowTypeResult.rows[0]) {
      throw new AppError('Expense flow type not found', 500);
    }

    return await this.addCashFlow(cashboxId, {
      flow_type_id: flowTypeResult.rows[0].id,
      reference_table,
      reference_id,
      amount: -Math.abs(amount) // Ensure negative
    });
  }

  /**
   * Get transactions for a cashbox
   * @param {number} cashboxId - Cashbox ID
   * @returns {Promise<Array>} Transactions
   */
  async getTransactions(cashboxId) {
    return await this.getCashFlow(cashboxId);
  }

  /**
   * Get cashbox summary
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Cashbox summary
   */
  async getSummary(filters = {}) {
    const db = require('../../../config/database');
    
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND opened_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND opened_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Get summary statistics
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_sessions,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_sessions,
        COALESCE(SUM(opening_amount), 0) as total_opening,
        COALESCE(SUM(closing_amount), 0) as total_closing,
        COALESCE(SUM(difference), 0) as total_difference
      FROM cashboxes 
      WHERE 1=1${dateFilter}
    `, params);

    return {
      summary: summaryResult.rows[0],
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date
      }
    };
  }

  /**
   * Get today's cashbox sessions
   * @returns {Promise<Array>} Today's sessions
   */
  async getTodaySessions() {
    const db = require('../../../config/database');
    
    const result = await db.query(`
      SELECT cb.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM cashboxes cb
      LEFT JOIN users u ON cb.user_id = u.id
      WHERE DATE(cb.opened_at) = CURRENT_DATE
      ORDER BY cb.opened_at DESC
    `);
    
    return result.rows;
  }
}

module.exports = new CashboxService();
