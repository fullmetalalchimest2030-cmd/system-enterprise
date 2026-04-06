/**
 * Reports Controller - HTTP layer for report operations
 * @module modules/reports/controllers/reportController
 */

const reportService = require('../services/reportService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class ReportController {
  /**
   * Get profitability report by period
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getProfitabilityByPeriod = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const report = await reportService.getProfitabilityByPeriod(filters);
    res.json(successResponse(report, 'Profitability report retrieved successfully'));
  });

  /**
   * Get sales by payment method
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSalesByPaymentMethod = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const report = await reportService.getSalesByPaymentMethod(filters);
    res.json(successResponse(report, 'Sales by payment method retrieved successfully'));
  });

  /**
   * Get sales by employee
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getSalesByEmployee = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      employee_id: req.query.employee_id
    };
    
    const report = await reportService.getSalesByEmployee(filters);
    res.json(successResponse(report, 'Sales by employee retrieved successfully'));
  });

  /**
   * Get waste valuation report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getWasteValuation = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const report = await reportService.getWasteValuation(filters);
    res.json(successResponse(report, 'Waste valuation report retrieved successfully'));
  });

  /**
   * Get inventory turnover report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getInventoryTurnover = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const report = await reportService.getInventoryTurnover(filters);
    res.json(successResponse(report, 'Inventory turnover report retrieved successfully'));
  });

  /**
   * Get product performance (top/bottom sellers)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getProductPerformance = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit
    };
    
    const report = await reportService.getProductPerformance(filters);
    res.json(successResponse(report, 'Product performance report retrieved successfully'));
  });

  /**
   * Get demand forecast (AI powered)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getDemandForecast = asyncHandler(async (req, res, next) => {
    const filters = {
      periods: req.query.periods ? parseInt(req.query.periods) : 30
    };
    
    const report = await reportService.getDemandForecast(filters);
    res.json(successResponse(report, 'Demand forecast retrieved successfully'));
  });

  /**
   * Generate comprehensive report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  generateComprehensiveReport = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const report = await reportService.generateComprehensiveReport(filters);
    res.json(successResponse(report, 'Comprehensive report generated successfully'));
  });
}

module.exports = new ReportController();
