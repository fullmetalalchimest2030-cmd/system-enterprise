/**
 * Equity Service - Monthly working capital closure orchestration
 * @module modules/equity/services/equityService
 */

const equityModel = require('../models/equityModel');
const financeModel = require('../../finances/models/financeModel');
const config = require('../../../config');
const db = require('../../../config/database');

class EquityService {
  /**
   * Orchestrates the monthly equity closure atomically.
   * @param {number} year
   * @param {number} month
   * @param {number} userId
   * @param {string|undefined} notes
   * @returns {Promise<object>} Created EquityRecord
   */
  async closeMonth(year, month, userId, notes) {
    // 1. Verify period has not been closed already
    const existing = await equityModel.findByPeriod(year, month);
    if (existing) {
      const error = new Error(`El período ${year}-${month} ya fue cerrado`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Get initial capital (previous period or .env fallback)
    const previousCapital = await equityModel.getPreviousCapital(year, month);
    const initial_capital = previousCapital !== null
      ? previousCapital
      : config.workingCapital.initialCapital;

    // 3. Calculate date range for the period
    const monthStr = String(month).padStart(2, '0');
    const start_date = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    const end_date = `${year}-${monthStr}-${lastDayStr}`;

    // 4. Fetch financial components in parallel
    const [inventoryValue, wasteValue, cash_in_boxes, total_expenses] = await Promise.all([
      financeModel.getInventoryValue(),
      financeModel.getWasteValue({ start_date, end_date }),
      financeModel.getCashInBoxes({ start_date, end_date }),
      financeModel.getTotalExpenses({ start_date, end_date }),
    ]);

    // 5. Calculate derived values
    const inventory_net = inventoryValue - wasteValue;
    const final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses;

    // 6. Persist inside a transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const record = await equityModel.create(client, {
        period_year: year,
        period_month: month,
        initial_capital,
        inventory_net,
        cash_in_boxes,
        total_expenses,
        final_capital,
        notes,
        closed_by: userId,
      });

      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns the current working capital and its source.
   * @returns {Promise<{ capital: number, source: string }>}
   */
  async getCurrentCapital() {
    const stored = await equityModel.getCurrentCapital();
    return {
      capital: stored !== null ? stored : config.workingCapital.initialCapital,
      source: stored !== null ? 'equity' : 'environment',
    };
  }

  /**
   * Returns the equity history.
   * @param {number|undefined} limit
   * @returns {Promise<object[]>}
   */
  async getHistory(limit) {
    return equityModel.getHistory(limit);
  }
}

module.exports = new EquityService();
