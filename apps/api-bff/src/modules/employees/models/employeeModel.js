/**
 * Employee model
 * @module modules/employees/models/employeeModel
 */

const db = require('../../../config/database');
const bcrypt = require('bcryptjs');

/**
 * Employee model class
 * Uses 'users' table for authentication
 */
class EmployeeModel {
  /**
   * Get all employees (users with roles)
   * @param {Object} filters - Optional filters (is_active, show_deleted)
   * @returns {Promise<Array>} Employees array
   */
  async findAll(filters = {}) {
      let query = `
        SELECT u.id, u.first_name, u.last_name, u.email,u.phone, u.is_active, u.created_at, u.deleted_at,
                COALESCE(r.name, 'cashier') as role
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE 1=1
      `;

      const params = [];
      let paramCount = 1;

      if (filters.is_active !== undefined) {
        let isActiveValue;
        const inputVal = filters.is_active;

        if (inputVal === 'true' || inputVal === true || inputVal === 1 || inputVal === '1') {
          isActiveValue = true;
        } else if (inputVal === 'false' || inputVal === false || inputVal === 0 || inputVal === '0') {
          isActiveValue = false;
        } else {
          isActiveValue = true;
        }

        query += ` AND u.is_active = $${paramCount}`;
        params.push(isActiveValue);
        paramCount++;
      }

      if (!filters.show_deleted || filters.show_deleted === 'false') {
        query += ` AND u.deleted_at IS NULL`;
      }

      query += ` ORDER BY u.created_at DESC`;

      if (filters.limit) {
        query += ` LIMIT $${paramCount}`;
        params.push(parseInt(filters.limit));
        paramCount++;
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount}`;
        params.push(parseInt(filters.offset));
        paramCount++;
      }

      const result = await db.query(query, params);
      return result.rows;
    }


  /**
   * Get employee by ID
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Employee object
   */
  async findById(id) {
    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.created_at,
              COALESCE(r.name, 'cashier') as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Get employee by email
   * @param {string} email - Employee email
   * @returns {Promise<Object>} Employee object
   */
  async findByEmail(email) {
    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.is_active, u.created_at,
              COALESCE(r.name, 'cashier') as role
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email]
    );
    return result.rows[0];
  }

  /**
   * Create a new employee
   * @param {Object} employee - Employee data
   * @returns {Promise<Object>} Created employee
   */
  async create(employee) {
    const { first_name, last_name, email, phone, role, password, hire_date } = employee;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash,phone, is_active, created_at)
       VALUES ($1, $2, $3, $4,$5, true, NOW())
       RETURNING id, first_name, last_name, email, is_active, created_at`,
      [first_name, last_name, email, password_hash, phone]
    );
    
    const newUser = result.rows[0];
    
    // Assign role if provided
    if (role) {
      const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length > 0) {
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUser.id, roleResult.rows[0].id]
        );
      }
    }
    
    return { ...newUser, role: role || 'cashier' };
  }

  /**
   * Update an employee
   * @param {number} id - Employee ID
   * @param {Object} employee - Employee data to update
   * @returns {Promise<Object>} Updated employee
   */
  async update(id, employee) {
    const { first_name, last_name, email, phone, is_active, role } = employee;
    
    const result = await db.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name), 
           email = COALESCE($3, email), 
           phone = COALESCE($4, phone),
           is_active = COALESCE($5, is_active)
       WHERE id = $6 AND deleted_at IS NULL
       RETURNING id, first_name, last_name, email, phone, is_active, created_at`,
      [first_name, last_name, email, phone, is_active, id]
    );

    // Update role in user_roles table if provided
    if (role) {
      const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length > 0) {
        // Delete existing role and insert new one
        await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [id, roleResult.rows[0].id]
        );
      }
    }

    // Return updated employee with role
    return await this.findById(id);
  }

  /**
   * Delete an employee (soft delete - set deleted_at)
   * @param {number} id - Employee ID
   * @returns {Promise<boolean>} True if updated
   */
  async delete(id) {
    const result = await db.query(
      'UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Restore a deleted employee
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Restored employee
   */
  async restore(id) {
    const result = await db.query(
      `UPDATE users 
       SET deleted_at = NULL, is_active = true
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING id, first_name, last_name, email, is_active, deleted_at, created_at`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Hard delete an employee (admin only)
   * @param {number} id - Employee ID
   * @returns {Promise<boolean>} True if deleted
   */
  async hardDelete(id) {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * Update password
   * @param {number} id - Employee ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} True if updated
   */
  async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);
    
    const result = await db.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [password_hash, id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get employee performance metrics
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformance(id) {
    const employee = await this.findById(id);
    if (!employee) return null;

    // Get sales count for the employee (for cashiers)
    const salesResult = await db.query(
      `SELECT COUNT(*) as total_sales, COALESCE(SUM(total_amount), 0) as total_revenue
       FROM sales 
       WHERE user_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [id]
    );

    return {
      employee_id: id,
      role: employee.role,
      total_sales: parseInt(salesResult.rows[0].total_sales) || 0,
      total_revenue: parseFloat(salesResult.rows[0].total_revenue) || 0,
      period: 'current_month'
    };
  }
}

module.exports = new EmployeeModel();
