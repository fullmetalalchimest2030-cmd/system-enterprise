/**
 * Sales Controller - HTTP layer for sales operations
 * @module modules/sales/controllers/salesController
 */

const salesService = require('../services/salesService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class SalesController {
  /**
   * Get all sales with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllSales = asyncHandler(async (req, res, next) => {
    const filters = {
      status: req.query.status,
      payment_method: req.query.payment_method,
      employee_id: req.query.employee_id,
      customer_id: req.query.customer_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const sales = await salesService.getAllSales(filters);
    res.json(successResponse(sales, 'Sales retrieved successfully'));
  });

  /**
   * Get sale by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSaleById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const sale = await salesService.getSaleById(id);
    res.json(successResponse(sale, 'Sale retrieved successfully'));
  });

  /**
   * Get detailed sale with items
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getDetailedSale = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const sale = await salesService.getDetailedSale(id);
    res.json(successResponse(sale, 'Detailed sale retrieved successfully'));
  });

  /**
   * Create a new sale
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createSale = asyncHandler(async (req, res, next) => {
    const saleData = {
      ...req.body,
      employee_id: req.body.employee_id || req.user.id
    };
    
    const sale = await salesService.createSale(saleData);
    res.status(201).json(successResponse(sale, 'Sale created successfully'));
  });

  /**
   * Update a sale
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateSale = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const sale = await salesService.updateSale(id, req.body);
    res.json(successResponse(sale, 'Sale updated successfully'));
  });

  /**
   * Cancel a sale
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  cancelSale = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    const sale = await salesService.cancelSale(id, userId);
    res.json(successResponse(sale, 'Sale cancelled successfully'));
  });

  /**
   * Complete a pending sale
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  completeSale = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const saleData = {
      ...req.body,
      employee_id: req.user.id
    };
    
    const sale = await salesService.completeSale(id, saleData);
    res.json(successResponse(sale, 'Sale completed successfully'));
  });

  /**
   * Get sales statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getStatistics = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const stats = await salesService.getStatistics(filters);
    res.json(successResponse(stats, 'Sales statistics retrieved successfully'));
  });

  /**
   * Get sales by employee
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSalesByEmployee = asyncHandler(async (req, res, next) => {
    const { employeeId } = req.params;
    const filters = {
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const sales = await salesService.getSalesByEmployee(employeeId, filters);
    res.json(successResponse(sales, 'Employee sales retrieved successfully'));
  });

  /**
   * Get today's sales
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getTodaySales = asyncHandler(async (req, res, next) => {
    const sales = await salesService.getTodaySales();
    res.json(successResponse(sales, "Today's sales retrieved successfully"));
  });

  /**
   * Process a quick sale (POS)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  processQuickSale = asyncHandler(async (req, res, next) => {
    const saleData = {
      ...req.body,
      user_id: req.body.user_id || req.user.id
    };
    
    const sale = await salesService.processQuickSale(saleData);
    res.status(201).json(successResponse(sale, 'Quick sale processed successfully'));
  });

  /**
   * Calculate sale total
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  calculateTotal = asyncHandler(async (req, res, next) => {
    const { details } = req.body;
    const total = await salesService.calculateTotal(details);
    res.json(successResponse({ total }, 'Total calculated successfully'));
  });
}

module.exports = new SalesController();
