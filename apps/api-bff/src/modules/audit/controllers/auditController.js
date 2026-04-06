/**
 * Audit Controller - HTTP layer for audit log operations
 * @module modules/audit/controllers/auditController
 */

const auditService = require('../services/auditService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class AuditController {
  /**
   * Get all audit logs with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllLogs = asyncHandler(async (req, res, next) => {
    const filters = {
      user_id: req.query.user_id,
      action: req.query.action,
      table_name: req.query.table_name,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const logs = await auditService.getAllLogs(filters);
    res.json(successResponse(logs, 'Audit logs retrieved successfully'));
  });

  /**
   * Get audit log by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getLogById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const log = await auditService.getLogById(id);
    res.json(successResponse(log, 'Audit log retrieved successfully'));
  });

  /**
   * Create a new audit log
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createLog = asyncHandler(async (req, res, next) => {
    const logData = {
      ...req.body,
      user_id: req.body.user_id || req.user.id,
      ip_address: req.ip || req.connection.remoteAddress
    };
    
    const log = await auditService.createLog(logData);
    res.status(201).json(successResponse(log, 'Audit log created successfully'));
  });

  /**
   * Get audit logs by user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getLogsByUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const filters = {
      action: req.query.action,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const logs = await auditService.getLogsByUser(userId, filters);
    res.json(successResponse(logs, 'User audit logs retrieved successfully'));
  });

  /**
   * Get audit logs by record
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getLogsByRecord = asyncHandler(async (req, res, next) => {
    const { tableName, recordId } = req.params;
    const logs = await auditService.getLogsByRecord(tableName, recordId);
    res.json(successResponse(logs, 'Record audit logs retrieved successfully'));
  });

  /**
   * Get action statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getActionStatistics = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const stats = await auditService.getActionStatistics(filters);
    res.json(successResponse(stats, 'Action statistics retrieved successfully'));
  });
}

module.exports = new AuditController();
