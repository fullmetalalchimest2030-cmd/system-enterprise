/**
 * Audit Model - Audit log tracking
 * @module modules/audit/models/auditModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class AuditModel {
  /**
   * Get all audit logs
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Audit logs array
   */
  async findAll(filters = {}) {
    let query = `
      SELECT a.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.user_id) {
      query += ` AND a.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND a.action = $${paramCount}`;
      params.push(filters.action);
      paramCount++;
    }

    if (filters.module) {
      query += ` AND a.module = $${paramCount}`;
      params.push(filters.module);
      paramCount++;
    }

    if (filters.reference_table) {
      query += ` AND a.reference_table = $${paramCount}`;
      params.push(filters.reference_table);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND a.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND a.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY a.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    
    return result.rows.map(log => ({
      ...log,
      old_values: log.old_values,
      new_values: log.new_values
    }));
  }
  /**
   * Get audit log by ID
   * @param {number} id - Audit log ID
   * @returns {Promise<Object>} Audit log object
   */
  async findById(id) {
    const result = await db.query(`
      SELECT a.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [id]);

    if (!result.rows[0]) return null;
    
    return result.rows[0];
  }

  /**
   * Create a new audit log
   * @param {Object} audit - Audit log data
   * @returns {Promise<Object>} Created audit log
   */
  async create(audit) {
    const { user_id, action, module, reference_table, reference_id, old_values, new_values } = audit;
    
    console.log('[AUDIT MODEL DEBUG] create() llamado');
    console.log('[AUDIT MODEL DEBUG] Parámetros:', { user_id, action, module, reference_table, reference_id });
    console.log('[AUDIT MODEL DEBUG] old_values:', old_values);
    console.log('[AUDIT MODEL DEBUG] new_values:', new_values);
    
    const result = await db.query(`
      INSERT INTO audit_logs (user_id, action, module, reference_table, reference_id, old_values, new_values, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [user_id, action, module, reference_table, reference_id, old_values, new_values]);
    
    console.log('[AUDIT MODEL DEBUG] ✅ Insert completado, rows:', result.rowCount);
    return result.rows[0];
  }

  /**
   * Get audit logs by user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Audit logs
   */
  async findByUserId(userId) {
    const result = await db.query(`
      SELECT a.* 
      FROM audit_logs a
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `, [userId]);
    return result.rows;
  }

  /**
   * Get audit logs by record (table and record ID)
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @returns {Promise<Array>} Audit logs
   */
  async findByRecord(tableName, recordId) {
    const result = await db.query(`
      SELECT a.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.reference_table = $1 AND a.reference_id = $2
      ORDER BY a.created_at DESC
    `, [tableName, recordId]);
    return result.rows;
  }
  /**
   * Get action statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Action statistics
   */
  async getActionStatistics(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND a.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND a.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Action counts
    const actionResult = await db.query(`
      SELECT 
        a.action,
        COUNT(*) as count,
        COUNT(DISTINCT a.user_id) as unique_users
      FROM audit_logs a
      WHERE 1=1${dateFilter}
      GROUP BY a.action
      ORDER BY count DESC
    `, params);

    // Module counts
    const moduleResult = await db.query(`
      SELECT 
        a.module,
        COUNT(*) as count
      FROM audit_logs a
      WHERE 1=1${dateFilter}
      GROUP BY a.module
      ORDER BY count DESC
    `, params);

    // User activity
    const userResult = await db.query(`
      SELECT 
        u.first_name,
        u.last_name,
        COUNT(*) as action_count
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1${dateFilter}
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY action_count DESC
      LIMIT 10
    `, params);

    return {
      by_action: actionResult.rows,
      by_module: moduleResult.rows,
      top_users: userResult.rows
    };
  }
}

module.exports = new AuditModel();