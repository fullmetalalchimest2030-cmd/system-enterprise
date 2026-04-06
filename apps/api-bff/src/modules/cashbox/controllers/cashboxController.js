/**
 * Cashbox Controller - HTTP layer for cashbox operations
 * @module modules/cashbox/controllers/cashboxController
 */

const cashboxService = require('../services/cashboxService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class CashboxController {
  /**
   * Get all cashbox sessions with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllSessions = asyncHandler(async (req, res, next) => {
    const filters = {
      status: req.query.status,
      employee_id: req.query.employee_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const sessions = await cashboxService.getAllSessions(filters);
    res.json(successResponse(sessions, 'Cashbox sessions retrieved successfully'));
  });

  /**
   * Get cashbox session by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSessionById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const session = await cashboxService.getSessionById(id);
    res.json(successResponse(session, 'Cashbox session retrieved successfully'));
  });

  /**
   * Get current open cashbox session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getCurrentOpenSession = asyncHandler(async (req, res, next) => {
    const employeeId = req.query.employee_id;
    const session = await cashboxService.getCurrentOpenSession(employeeId);
    res.json(successResponse(session, 'Current open session retrieved successfully'));
  });

  /**
   * Open a new cashbox session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  openSession = asyncHandler(async (req, res, next) => {
    const cashboxData = {
      ...req.body,
      employee_id: req.body.employee_id || req.user.id
    };
    
    const session = await cashboxService.openSession(cashboxData);
    res.status(201).json(successResponse(session, 'Cashbox session opened successfully'));
  });

  /**
   * Close a cashbox session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  closeSession = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const session = await cashboxService.closeSession(id, req.body);
    res.json(successResponse(session, 'Cashbox session closed successfully'));
  });

  /**
   * Add income to cashbox
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  addIncome = asyncHandler(async (req, res, next) => {
    const { cashboxId } = req.params;
    const data = {
      ...req.body,
      user_id: req.user.id
    };
    
    const session = await cashboxService.addIncome(cashboxId, data);
    res.json(successResponse(session, 'Income added successfully'));
  });

  /**
   * Add expense to cashbox
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  addExpense = asyncHandler(async (req, res, next) => {
    const { cashboxId } = req.params;
    const data = {
      ...req.body,
      user_id: req.user.id
    };
    
    const session = await cashboxService.addExpense(cashboxId, data);
    res.json(successResponse(session, 'Expense added successfully'));
  });

  /**
   * Get cashbox transactions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getTransactions = asyncHandler(async (req, res, next) => {
    const { cashboxId } = req.params;
    const transactions = await cashboxService.getTransactions(cashboxId);
    res.json(successResponse(transactions, 'Transactions retrieved successfully'));
  });

  /**
   * Get cashbox summary
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSummary = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const summary = await cashboxService.getSummary(filters);
    res.json(successResponse(summary, 'Cashbox summary retrieved successfully'));
  });

  /**
   * Get today's cashbox sessions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getTodaySessions = asyncHandler(async (req, res, next) => {
    const sessions = await cashboxService.getTodaySessions();
    res.json(successResponse(sessions, "Today's sessions retrieved successfully"));
  });

  /**
   * Get cashbox status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getStatus = asyncHandler(async (req, res, next) => {
    const employeeId = req.query.employee_id || req.user.id;
    const status = await cashboxService.getStatus(employeeId);
    res.json(successResponse(status, 'Cashbox status retrieved successfully'));
  });

  /**
   * Calculate expected cash for a session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  calculateExpectedCash = asyncHandler(async (req, res, next) => {
    const { cashboxId } = req.params;
    const calculation = await cashboxService.calculateExpectedCash(cashboxId);
    res.json(successResponse(calculation, 'Expected cash calculated successfully'));
  });
}

module.exports = new CashboxController();
