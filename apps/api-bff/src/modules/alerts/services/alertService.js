/**
 * Alert Service - Business logic for alert operations
 * @module modules/alerts/services/alertService
 */

const alertModel = require('../models/alertModel');
const productModel = require('../../products/models/productModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

const VALID_TYPES = ['low_stock', 'high_waste', 'low_profit', 'cash_difference'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

class AlertService {
  /**
   * Get all alerts with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Alerts array
   */
  async getAllAlerts(filters) {
    return await alertModel.findAll(filters);
  }

  /**
   * Get alert by ID
   * @param {number} id - Alert ID
   * @returns {Promise<Object>} Alert object
   */
  async getAlertById(id) {
    const alert = await alertModel.findById(id);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }
    return alert;
  }

  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   * @returns {Promise<Object>} Created alert
   */
  async createAlert(alertData) {
    const { type, title, message, severity, related_id, created_by } = alertData;

    // Validate required fields
    if (!type || !title || !message) {
      throw new AppError('Type, title, and message are required', 400);
    }

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      throw new AppError(`Invalid type. Valid types are: ${VALID_TYPES.join(', ')}`, 400);
    }

    // Validate severity
    const alertSeverity = severity || 'medium';
    if (!VALID_SEVERITIES.includes(alertSeverity)) {
      throw new AppError(`Invalid severity. Valid severities are: ${VALID_SEVERITIES.join(', ')}`, 400);
    }

    return await alertModel.create({
      type,
      title,
      message,
      severity: alertSeverity,
      related_id,
      created_by
    });
  }

  /**
   * Mark alert as read
   * @param {number} id - Alert ID
   * @returns {Promise<Object>} Updated alert
   */
  async markAsRead(id) {
    const alert = await alertModel.findById(id);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    return await alertModel.markAsRead(id);
  }

  /**
   * Resolve alert
   * @param {number} id - Alert ID
   * @returns {Promise<Object>} Resolved alert
   */
  async resolveAlert(id) {
    const alert = await alertModel.findById(id);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    return await alertModel.resolve(id);
  }

  /**
   * Delete alert
   * @param {number} id - Alert ID
   * @returns {Promise<Object>} Deleted alert
   */
  async deleteAlert(id) {
    const alert = await alertModel.findById(id);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    return await alertModel.delete(id);
  }

  /**
   * Get unread count
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    return await alertModel.getUnreadCount();
  }

  /**
   * Mark all alerts as read
   * @returns {Promise<number>} Number of affected alerts
   */
  async markAllAsRead() {
    return await alertModel.markAllAsRead();
  }

  /**
   * Get critical alerts
   * @param {number} limit - Number of alerts
   * @returns {Promise<Array>} Critical alerts
   */
  async getCriticalAlerts(limit = 10) {
    return await alertModel.getCriticalAlerts(limit);
  }

  /**
   * Check and create low stock alerts
   * @returns {Promise<Array>} Created alerts
   */
  async checkLowStock() {
    const lowStockProducts = await productModel.findAll({ is_active: true });
    const alerts = [];

    for (const product of lowStockProducts) {
      if (product.stock <= product.min_stock) {
        // Check if alert already exists for this product
        const existingAlerts = await alertModel.findByType('low_stock');
        const alreadyAlerted = existingAlerts.some(a => 
          a.reference_id === product.id && a.is_read === true
        );

        if (!alreadyAlerted) {
          const alert = await alertModel.create({
            type: 'low_stock',
            title: 'Low Stock Alert',
            message: `Product "${product.name}" is running low. Current stock: ${product.stock}, Minimum stock: ${product.min_stock}`,
            severity: product.stock === 0 ? 'critical' : 'high',
            related_id: product.id,
            created_by: null
          });
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  /**
   * Get valid alert types
   * @returns {Array} Valid types
   */
  getValidTypes() {
    return VALID_TYPES;
  }

  /**
   * Get valid severities
   * @returns {Array} Valid severities
   */
  getValidSeverities() {
    return VALID_SEVERITIES;
  }
}

module.exports = new AlertService();
