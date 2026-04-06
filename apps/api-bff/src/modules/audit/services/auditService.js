/**
 * Audit Service - Business logic for audit log operations
 * @module modules/audit/services/auditService
 */

const auditModel = require('../models/auditModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

const VALID_ACTIONS = [
  'create', 'read', 'update', 'delete', 'login', 'logout', 
  'sale_created', 'sale_completed', 'sale_cancelled',
  'inventory_in', 'inventory_out', 'inventory_adjustment',
  'cashbox_open', 'cashbox_close', 'cashbox_adjustment',
  'expense_created', 'expense_updated', 'expense_deleted',
  'alert_created', 'alert_resolved', 'user_created', 'user_updated'
];

class AuditService {
  /**
   * Get all audit logs with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Audit logs array
   */
  async getAllLogs(filters) {
    return await auditModel.findAll(filters);
  }

  /**
   * Get audit log by ID
   * @param {number} id - Audit log ID
   * @returns {Promise<Object>} Audit log object
   */
  async getLogById(id) {
    const log = await auditModel.findById(id);
    if (!log) {
      throw new AppError('Audit log not found', 404);
    }
    return log;
  }

  /**
   * Create a new audit log
   * @param {Object} auditData - Audit log data
   * @returns {Promise<Object>} Created audit log
   */
  async createLog(auditData) {
    const { user_id, action, table_name, record_id, old_values, new_values, ip_address } = auditData;


    // Validate action if provided
    if (action && !VALID_ACTIONS.includes(action)) {
      throw new AppError(`Invalid action. Valid actions are: ${VALID_ACTIONS.join(', ')}`, 400);
    }

    return await auditModel.create({
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      ip_address
    });
  }

  /**
   * Get audit logs by user
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Audit logs
   */
  async getLogsByUser(userId, filters) {
    return await auditModel.findByUserId(userId, filters);
  }

  /**
   * Get audit logs by record
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @returns {Promise<Array>} Audit logs
   */
  async getLogsByRecord(tableName, recordId) {
    return await auditModel.findByRecord(tableName, recordId);
  }

  /**
   * Get action statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Action statistics
   */
  async getActionStatistics(filters) {
    return await auditModel.getActionStatistics(filters);
  }

  /**
   * Get valid actions
   * @returns {Array} Valid actions
   */
  getValidActions() {
    return VALID_ACTIONS;
  }

  /**
   * Log an action (convenience method)
   * @param {Object} data - Log data
   */
  async logAction({ userId, action, tableName, recordId, oldValues, newValues, ipAddress }) {
    return await this.createLog({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress
    });
  }
}

module.exports = new AuditService();
