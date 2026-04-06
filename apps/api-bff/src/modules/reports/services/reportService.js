/**
 * Reports Service - Business logic for report generation
 * @module modules/reports/services/reportService
 */

const reportModel = require('../models/reportModel');
const { AppError } = require('../../../shared/middleware/errorHandler');
const config = require('../../../config');

class ReportService {
  /**
   * Helper to call Analytics Engine
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Analytics result
   */
  async _callAnalytics(endpoint, data) {
    try {
      const response = await fetch(`${config.analytics.baseUrl}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(config.analytics.timeout)
      });
      
      if (!response.ok) {
        console.warn(`Analytics service error: ${response.statusText}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.warn(`Failed to connect to Analytics service: ${error.message}`);
      return null;
    }
  }

  /**
   * Get profitability report by period
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Profitability data
   */
  async getProfitabilityByPeriod(filters) {
    // Validate date range
    if (filters.start_date && filters.end_date) {
      const startDate = new Date(filters.start_date);
      const endDate = new Date(filters.end_date);
      
      if (startDate > endDate) {
        throw new AppError('Start date must be before end date', 400);
      }
    }

    // Get basic data from DB
    const dbData = await reportModel.getProfitabilityByPeriod(filters);
    
    // Enrich with AI Analytics if possible
    const analytics = await this._callAnalytics('profitability', {
      sales: dbData.raw_sales || [], // Assuming raw_sales is added to model
      expenses: dbData.raw_expenses || []
    });

    return {
      ...dbData,
      ai_insights: analytics
    };
  }

  /**
   * Get demand forecast
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Forecast data
   */
  async getDemandForecast(filters) {
    const salesHistory = await reportModel.getSalesHistory(filters);
    const forecast = await this._callAnalytics('forecast', {
      sales_history: salesHistory,
      periods: filters.periods || 30
    });
    
    return forecast || { message: 'Forecast unavailable' };
  }

  /**
   * Get sales by payment method
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Sales by payment method
   */
  async getSalesByPaymentMethod(filters) {
    return await reportModel.getSalesByPaymentMethod(filters);
  }

  /**
   * Get sales by employee
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Sales by employee
   */
  async getSalesByEmployee(filters) {
    return await reportModel.getSalesByEmployee(filters);
  }

  /**
   * Get waste valuation report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Waste valuation data
   */
  async getWasteValuation(filters) {
    return await reportModel.getWasteValuation(filters);
  }

  /**
   * Get inventory turnover report
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Inventory turnover data
   */
  async getInventoryTurnover(filters) {
    return await reportModel.getInventoryTurnover(filters);
  }

  /**
   * Get product performance (top/bottom sellers)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Product performance data
   */
  async getProductPerformance(filters) {
    return await reportModel.getProductPerformance(filters);
  }

  /**
   * Generate comprehensive report
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Comprehensive report
   */
  async generateComprehensiveReport(filters) {
    const [profitability, salesByPayment, salesByEmployee, waste, productPerformance] = await Promise.all([
      this.getProfitabilityByPeriod(filters),
      this.getSalesByPaymentMethod(filters),
      this.getSalesByEmployee(filters),
      this.getWasteValuation(filters),
      this.getProductPerformance(filters)
    ]);

    return {
      period: {
        start_date: filters.start_date,
        end_date: filters.end_date
      },
      profitability,
      sales_by_payment_method: salesByPayment,
      sales_by_employee: salesByEmployee,
      waste_valuation: waste,
      product_performance: productPerformance,
      generated_at: new Date()
    };
  }
}

module.exports = new ReportService();
