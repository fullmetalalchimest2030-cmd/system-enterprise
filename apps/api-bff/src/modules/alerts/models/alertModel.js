/**
 * Alert Model - Notification management
 * @module modules/alerts/models/alertModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class AlertModel {
  /**
   * Get all notifications
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Notifications array
   */
  async findAll(filters = {}) {
    let query = `
      SELECT n.* 
      FROM notifications n
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.type) {
      query += ` AND n.type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }

    if (filters.severity) {
      query += ` AND n.severity = $${paramCount}`;
      params.push(filters.severity);
      paramCount++;
    }

    if (filters.is_read !== undefined) {
      query += ` AND n.is_read = $${paramCount}`;
      params.push(filters.is_read);
      paramCount++;
    }

    query += ` ORDER BY n.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get notification by ID
   * @param {number} id - Notification ID
   * @returns {Promise<Object>} Notification object
   */
  async findById(id) {
    const result = await db.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new notification
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async create(notification) {
    const { type, severity, message, related_id, title, created_by } = notification;
    
    // Map service field names to database column names
    const dbMessage = title ? `[${title}] ${message}` : message;
    const referenceId = related_id || null;
    const referenceTable = created_by ? 'user_created' : null;
    
    const result = await db.query(`
      INSERT INTO notifications (type, severity, message, reference_table, reference_id, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
      RETURNING *
    `, [type, severity || 'warning', dbMessage, referenceTable, referenceId]);
    
    return result.rows[0];
  }

  /**
   * Mark notification as read
   * @param {number} id - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(id) {
    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Delete a notification
   * @param {number} id - Notification ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const result = await db.query(
      'DELETE FROM notifications WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get unread count
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = false'
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get critical alerts
   * @param {number} limit - Number of alerts to return
   * @returns {Promise<Array>} Critical alerts
   */
  async getCriticalAlerts(limit = 10) {
    const result = await db.query(
      'SELECT * FROM notifications WHERE severity = $1 ORDER BY created_at DESC LIMIT $2',
      ['critical', limit]
    );
    return result.rows;
  }

  /**
   * Resolve a notification
   * Note: resolved_at column not in DB schema, marking as read as workaround
   * @param {number} id - Notification ID
   * @returns {Promise<Object>} Resolved notification
   */
  async resolve(id) {
    // Since resolved_at doesn't exist in DB schema, mark as read as alternative
    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<number>} Number of affected notifications
   */
  async markAllAsRead() {
    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE is_read = false RETURNING *'
    );
    return result.rowCount;
  }

  /**
   * Find notifications by type
   * @param {string} type - Notification type
   * @returns {Promise<Array>} Notifications array
   */
  async findByType(type) {
    const result = await db.query(
      'SELECT * FROM notifications WHERE type = $1 ORDER BY created_at DESC',
      [type]
    );
    return result.rows;
  }
}

module.exports = new AlertModel();
