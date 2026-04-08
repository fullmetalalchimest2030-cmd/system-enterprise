/**
 * Equity Controller - HTTP layer for equity working capital operations
 * @module modules/equity/controllers/equityController
 */

const equityService = require('../services/equityService');

/**
 * POST /equity/close
 * Closes the monthly equity period.
 */
async function closeMonth(req, res) {
  try {
    const { period_year, period_month, notes } = req.body;

    // Validate presence
    if (period_year === undefined || period_year === null ||
        period_month === undefined || period_month === null) {
      return res.status(400).json({ error: 'period_year y period_month son requeridos y deben ser válidos' });
    }

    // Validate integers
    if (!Number.isInteger(Number(period_year)) || !Number.isInteger(Number(period_month))) {
      return res.status(400).json({ error: 'period_year y period_month son requeridos y deben ser válidos' });
    }

    const year = parseInt(period_year);
    const month = parseInt(period_month);

    // Validate ranges
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'period_year y period_month son requeridos y deben ser válidos' });
    }

    if (year < 2020) {
      return res.status(400).json({ error: 'period_year y period_month son requeridos y deben ser válidos' });
    }

    const record = await equityService.closeMonth(year, month, req.user.id, notes);
    return res.status(201).json({ data: record });
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /equity/history
 * Returns the equity history.
 */
async function getHistory(req, res) {
  try {
    let limit;
    if (req.query.limit !== undefined) {
      const parsed = parseInt(req.query.limit);
      if (Number.isInteger(parsed) && parsed > 0) {
        limit = parsed;
      }
    }

    const records = await equityService.getHistory(limit);
    return res.status(200).json({ data: records });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /equity/current-capital
 * Returns the current working capital and its source.
 */
async function getCurrentCapital(req, res) {
  try {
    const { capital, source } = await equityService.getCurrentCapital();
    return res.status(200).json({ current_capital: capital, source });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { closeMonth, getHistory, getCurrentCapital };
