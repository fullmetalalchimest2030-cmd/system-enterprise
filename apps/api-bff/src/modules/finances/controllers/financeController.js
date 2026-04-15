/**
 * Finance Controller - HTTP layer for expense operations
 * @module modules/finances/controllers/financeController
 */

const financeService = require('../services/financeService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class FinanceController {
  /**
   * Get all expenses with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllExpenses = asyncHandler(async (req, res, next) => {
    const filters = {
      category: req.query.category,
      payment_method: req.query.payment_method,
      user_id: req.query.user_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const expenses = await financeService.getAllExpenses(filters);
    res.json(successResponse(expenses, 'Expenses retrieved successfully'));
  });

  /**
   * Get expense by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getExpenseById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const expense = await financeService.getExpenseById(id);
    res.json(successResponse(expense, 'Expense retrieved successfully'));
  });

  /**
   * Create a new expense
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createExpense = asyncHandler(async (req, res, next) => {
    const expenseData = {
      ...req.body,
      user_id: req.body.user_id || req.user.id
    };
    
    const expense = await financeService.createExpense(expenseData);
    res.status(201).json(successResponse(expense, 'Expense created successfully'));
  });

  /**
   * Update an expense
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateExpense = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const expense = await financeService.updateExpense(id, req.body);
    res.json(successResponse(expense, 'Expense updated successfully'));
  });

  /**
   * Delete an expense
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  deleteExpense = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    await financeService.deleteExpense(id);
    res.json(successResponse(null, 'Expense deleted successfully'));
  });

  /**
   * Get expenses summary by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSummaryByCategory = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const summary = await financeService.getSummaryByCategory(filters);
    res.json(successResponse(summary, 'Expenses summary retrieved successfully'));
  });

  /**
   * Get daily expenses
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getDailyExpenses = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const dailyExpenses = await financeService.getDailyExpenses(filters);
    res.json(successResponse(dailyExpenses, 'Daily expenses retrieved successfully'));
  });

  /**
   * Get valid categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getValidCategories = asyncHandler(async (req, res, next) => {
    const categories = financeService.getValidCategories();
    res.json(successResponse(categories, 'Valid categories retrieved successfully'));
  });

  /**
   * Get valid payment methods
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getValidPaymentMethods = asyncHandler(async (req, res, next) => {
    const methods = financeService.getValidPaymentMethods();
    res.json(successResponse(methods, 'Valid payment methods retrieved successfully'));
  });

}

module.exports = new FinanceController();
