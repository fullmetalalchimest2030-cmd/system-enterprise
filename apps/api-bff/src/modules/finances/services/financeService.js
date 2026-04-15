/**
 * Finance Service - Business logic for expense operations
 * @module modules/finances/services/financeService
 */

const financeModel = require('../models/financeModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

const VALID_CATEGORIES = ['flowers', 'services', 'transport', 'salaries', 'utilities', 'supplies', 'other'];
const VALID_PAYMENT_METHODS = ['cash', 'transfer', 'card', 'yape', 'plin'];

class FinanceService {
  /**
   * Get all expenses with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Expenses array
   */
  async getAllExpenses(filters) {
    return await financeModel.findAll(filters);
  }

  /**
   * Get expense by ID
   * @param {number} id - Expense ID
   * @returns {Promise<Object>} Expense object
   */
  async getExpenseById(id) {
    const expense = await financeModel.findById(id);
    if (!expense) {
      throw new AppError('Expense not found', 404);
    }
    return expense;
  }

  /**
   * Create a new expense
   * @param {Object} expenseData - Expense data
   * @returns {Promise<Object>} Created expense
   */
  async createExpense(expenseData) {
    const { cashbox_id,description, amount, category, date, payment_method, receipt_number, notes, user_id } = expenseData;

    if (!cashbox_id) {
      throw new AppError('Cashbox ID is required', 400);
    }
    // Validate required fields
    if (!description || !amount || !category) {
      throw new AppError('Description, amount, and category are required', 400);
    }

    // Validate amount
    if (amount <= 0) {
      throw new AppError('Amount must be greater than 0', 400);
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      throw new AppError(`Invalid category. Valid categories are: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    // Validate payment method if provided
    if (payment_method && !VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw new AppError(`Invalid payment method. Valid methods are: ${VALID_PAYMENT_METHODS.join(', ')}`, 400);
    }

    return await financeModel.create({
      cashbox_id,
      description,
      amount,
      category,
      date,
      payment_method,
      receipt_number,
      notes,
      user_id
    });
  }

  /**
   * Update an expense
   * @param {number} id - Expense ID
   * @param {Object} expenseData - Expense data to update
   * @returns {Promise<Object>} Updated expense
   */
  async updateExpense(id, expenseData) {
    const existingExpense = await financeModel.findById(id);
    if (!existingExpense) {
      throw new AppError('Expense not found', 404);
    }

    const { amount } = expenseData;
    if (amount !== undefined && amount <= 0) {
      throw new AppError('Amount must be greater than 0', 400);
    }

    return await financeModel.update(id, expenseData);
  }

  /**
   * Delete an expense
   * @param {number} id - Expense ID
   * @returns {Promise<Object>} Deleted expense
   */
  async deleteExpense(id) {
    const expense = await financeModel.findById(id);
    if (!expense) {
      throw new AppError('Expense not found', 404);
    }

    return await financeModel.delete(id);
  }

  /**
   * Get expenses summary by category
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Expenses summary
   */
  async getSummaryByCategory(filters) {
    return await financeModel.getSummaryByCategory(filters);
  }

  /**
   * Get daily expenses (last 30 days)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Daily expenses
   */
  async getDailyExpenses(filters) {
    return await financeModel.getDailyExpenses(filters);
  }

  /**
   * Get all valid categories
   * @returns {Array} Valid categories
   */
  getValidCategories() {
    return VALID_CATEGORIES;
  }

  /**
   * Get all valid payment methods
   * @returns {Array} Valid payment methods
   */
  getValidPaymentMethods() {
    return VALID_PAYMENT_METHODS;
  }

}

module.exports = new FinanceService();
