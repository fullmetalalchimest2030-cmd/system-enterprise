/**
 * Employee service
 * @module modules/employees/services/employeeService
 */

const employeeModel = require('../models/employeeModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

const VALID_ROLES = ['admin', 'cashier', 'warehouse'];

/**
 * Employee service class
 */
class EmployeeService {
  /**
   * Get all employees
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Employees array
   */
  async getAllEmployees(filters) {
    return await employeeModel.findAll(filters);
  }

  /**
   * Get employee by ID
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Employee object
   */
  async getEmployeeById(id) {
    const employee = await employeeModel.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }
    return employee;
  }

  /**
   * Create a new employee
   * @param {Object} employeeData - Employee data
   * @returns {Promise<Object>} Created employee
   */
  async createEmployee(employeeData) {
    const { first_name, last_name, email, phone, role, password, hire_date } = employeeData;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      throw new AppError('First name, last name, email, and password are required', 400);
    }

    // Validate role
    if (role && !VALID_ROLES.includes(role)) {
      throw new AppError(`Invalid role. Valid roles are: ${VALID_ROLES.join(', ')}`, 400);
    }

    // Check if email already exists
    const existingEmployee = await employeeModel.findByEmail(email);
    if (existingEmployee) {
      throw new AppError('Email already exists', 400);
    }

    return await employeeModel.create({
      first_name,
      last_name,
      email,
      phone,
      role: role || 'cashier',
      password,
      hire_date,
    });
  }

  /**
   * Update an employee
   * @param {number} id - Employee ID
   * @param {Object} employeeData - Employee data to update
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<Object>} Updated employee
   */
  async updateEmployee(id, employeeData, currentUser) {
    const existingEmployee = await employeeModel.findById(id);
    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    // Check if user has permission to update
    // Admin can update any employee, others can only update themselves
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new AppError('Not authorized to update this employee', 403);
    }

    // Only admin can change roles
    if (employeeData.role && currentUser.role !== 'admin') {
      throw new AppError('Not authorized to change role', 403);
    }

    // Validate role if provided
    if (employeeData.role && !VALID_ROLES.includes(employeeData.role)) {
      throw new AppError(`Invalid role. Valid roles are: ${VALID_ROLES.join(', ')}`, 400);
    }

    // Prevent changing own admin status
    if (currentUser.id === id && existingEmployee.role === 'admin' && employeeData.role !== 'admin') {
      throw new AppError('Cannot change own admin role', 403);
    }

    return await employeeModel.update(id, employeeData);
  }

  /**
   * Delete an employee
   * @param {number} id - Employee ID
   * @param {number} currentUserId - Current user ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteEmployee(id, currentUserId) {
    const existingEmployee = await employeeModel.findById(id);
    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    // Prevent self-deletion
    if (id === currentUserId) {
      throw new AppError('Cannot delete your own account', 400);
    }

    return await employeeModel.delete(id);
  }

  /**
   * Restore a deleted employee
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Restored employee
   */
  async restoreEmployee(id) {
    // Check if employee exists (even if deleted)
    const result = await employeeModel.findById(id);
    if (!result) {
      // Try to find in deleted employees
      const db = require('../../../config/database');
      const deletedEmployee = await db.query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NOT NULL',
        [id]
      );
      if (deletedEmployee.rows.length === 0) {
        throw new AppError('Employee not found', 404);
      }
    }

    return await employeeModel.restore(id);
  }

  /**
   * Get employee performance
   * @param {number} id - Employee ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getEmployeePerformance(id) {
    const existingEmployee = await employeeModel.findById(id);
    if (!existingEmployee) {
      throw new AppError('Employee not found', 404);
    }

    return await employeeModel.getPerformance(id);
  }

  /**
   * Change password
   * @param {number} id - Employee ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {Object} currentUser - Current user making the request
   * @returns {Promise<boolean>} True if password changed
   */
  async changePassword(id, currentPassword, newPassword, currentUser) {
    const employee = await employeeModel.findById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    // Check if user has permission to change password
    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new AppError('Not authorized to change this password', 403);
    }

    // Verify current password if not admin
    if (currentUser.id === id) {
      const bcrypt = require('bcryptjs');
      const isValid = await bcrypt.compare(currentPassword, employee.password_hash);
      if (!isValid) {
        throw new AppError('Current password is incorrect', 400);
      }
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    return await employeeModel.updatePassword(id, newPassword);
  }
}

module.exports = new EmployeeService();
