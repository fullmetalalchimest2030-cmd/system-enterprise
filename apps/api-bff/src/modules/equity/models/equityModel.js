/**
 * Equity Model - Monthly working capital persistence
 * @module modules/equity/models/equityModel
 */

const db = require('../../../config/database');

class EquityModel {
  /**
   * Returns the final_capital of the most recent equity record.
   * Returns null if no records exist.
   */
  async getCurrentCapital() {
    const result = await db.query(
      `SELECT final_capital FROM equity ORDER BY period_year DESC, period_month DESC LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    return parseFloat(result.rows[0].final_capital);
  }

  /**
   * Returns the final_capital of the most recent record strictly before (year, month).
   * Returns null if none exists.
   */
  async getPreviousCapital(year, month) {
    const result = await db.query(
      `SELECT final_capital
       FROM equity
       WHERE period_year < $1
          OR (period_year = $1 AND period_month < $2)
       ORDER BY period_year DESC, period_month DESC
       LIMIT 1`,
      [year, month]
    );
    if (result.rows.length === 0) return null;
    return parseFloat(result.rows[0].final_capital);
  }

  /**
   * Finds an equity record by exact (period_year, period_month).
   * Returns the full row or null.
   */
  async findByPeriod(year, month) {
    const result = await db.query(
      `SELECT * FROM equity WHERE period_year = $1 AND period_month = $2`,
      [year, month]
    );
    return result.rows[0] || null;
  }

  /**
   * Inserts a new equity record inside an already-started pg transaction.
   * @param {object} client - pg transaction client
   * @param {object} record - { period_year, period_month, initial_capital, inventory_net, cash_in_boxes, total_expenses, final_capital, notes, closed_by }
   * @returns {object} Created EquityRecord
   */
  async create(client, record) {
    const {
      period_year,
      period_month,
      initial_capital,
      inventory_net,
      cash_in_boxes,
      total_expenses,
      final_capital,
      notes,
      closed_by,
    } = record;

    const result = await client.query(
      `INSERT INTO equity
         (period_year, period_month, initial_capital, inventory_net, cash_in_boxes, total_expenses, final_capital, notes, closed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [period_year, period_month, initial_capital, inventory_net, cash_in_boxes, total_expenses, final_capital, notes, closed_by]
    );
    return result.rows[0];
  }

  /**
   * Returns equity history with variation_absolute and variation_percentage
   * calculated via window functions, ordered chronologically ASC.
   * @param {number|undefined} limit - Optional row limit
   */
  async getHistory(limit) {
    const baseQuery = `
      SELECT
        *,
        final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC) AS variation_absolute,
        ROUND(
          (
            (final_capital - LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC))
            / NULLIF(LAG(final_capital) OVER (ORDER BY period_year ASC, period_month ASC), 0)
          ) * 100,
          2
        ) AS variation_percentage
      FROM equity
      ORDER BY period_year ASC, period_month ASC
    `;

    if (limit !== undefined && limit !== null) {
      const result = await db.query(`${baseQuery} LIMIT $1`, [limit]);
      return result.rows;
    }

    const result = await db.query(baseQuery);
    return result.rows;
  }
}

module.exports = new EquityModel();
