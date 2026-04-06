/**
 * Alert Controller - HTTP layer for alert operations
 * @module modules/alerts/controllers/alertController
 */

const alertService = require('../services/alertService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class AlertController {
  /**
   * Get all alerts with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllAlerts = asyncHandler(async (req, res, next) => {
    const filters = {
      type: req.query.type,
      severity: req.query.severity,
      is_read: req.query.is_read,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const alerts = await alertService.getAllAlerts(filters);
    res.json(successResponse(alerts, 'Alerts retrieved successfully'));
  });

  /**
   * Get alert by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAlertById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const alert = await alertService.getAlertById(id);
    res.json(successResponse(alert, 'Alert retrieved successfully'));
  });

  /**
   * Create a new alert
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createAlert = asyncHandler(async (req, res, next) => {
    const alertData = {
      ...req.body,
      created_by: req.body.created_by || req.user.id
    };
    
    const alert = await alertService.createAlert(alertData);
    res.status(201).json(successResponse(alert, 'Alert created successfully'));
  });

  /**
   * Mark alert as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  markAsRead = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const alert = await alertService.markAsRead(id);
    res.json(successResponse(alert, 'Alert marked as read'));
  });

  /**
   * Resolve alert
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  resolveAlert = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const alert = await alertService.resolveAlert(id);
    res.json(successResponse(alert, 'Alert resolved successfully'));
  });

  /**
   * Delete alert
   * @param {Object} req - Express request object
   * @param {Object response object
   * @param {Function} next -} res - Express Express next function
   */
  deleteAlert = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    await alertService.deleteAlert(id);
    res.json(successResponse(null, 'Alert deleted successfully'));
  });

  /**
   * Get unread count
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getUnreadCount = asyncHandler(async (req, res, next) => {
    const count = await alertService.getUnreadCount();
    res.json(successResponse({ unread_count: count }, 'Unread count retrieved successfully'));
  });

  /**
   * Mark all alerts as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  markAllAsRead = asyncHandler(async (req, res, next) => {
    const count = await alertService.markAllAsRead();
    res.json(successResponse({ marked_count: count }, 'All alerts marked as read'));
  });

  /**
   * Get critical alerts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getCriticalAlerts = asyncHandler(async (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const alerts = await alertService.getCriticalAlerts(limit);
    res.json(successResponse(alerts, 'Critical alerts retrieved successfully'));
  });

  /**
   * Check low stock and create alerts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  checkLowStock = asyncHandler(async (req, res, next) => {
    const alerts = await alertService.checkLowStock();
    res.json(successResponse(alerts, 'Low stock check completed'));
  });
}

module.exports = new AlertController();
