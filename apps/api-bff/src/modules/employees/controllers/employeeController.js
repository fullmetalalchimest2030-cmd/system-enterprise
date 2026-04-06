/**
 * Employee controller
 * @module modules/employees/controllers/employeeController
 */

const employeeService = require('../services/employeeService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

/**
 * Employee controller class
 */
class EmployeeController {
  /**
   * Get all employees
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllEmployees = asyncHandler(async (req, res, next) => {
    console.log('[DEBUG employeeController.getAllEmployees] req.query:', JSON.stringify(req.query));
    
    const filters = {
      is_active: req.query.is_active,
      show_deleted: req.query.show_deleted,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    console.log('[DEBUG employeeController.getAllEmployees] filters being passed:', JSON.stringify(filters));
    
    const employees = await employeeService.getAllEmployees(filters);
    res.json(successResponse(employees, 'Employees retrieved successfully'));
  });

  /**
   * Get employee by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getEmployeeById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeById(id);
    res.json(successResponse(employee, 'Employee retrieved successfully'));
  });

  /**
   * Create a new employee
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createEmployee = asyncHandler(async (req, res, next) => {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json(successResponse(employee, 'Employee created successfully'));
  });

  /**
   * Update an employee
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const currentUser = req.user;
    const employee = await employeeService.updateEmployee(id, req.body, currentUser);
    res.json(successResponse(employee, 'Employee updated successfully'));
  });

  /**
   * Delete an employee
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  deleteEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const currentUserId = req.user.id;
    await employeeService.deleteEmployee(id, currentUserId);
    res.json(successResponse(null, 'Employee deleted successfully'));
  });

  /**
   * Restore a deleted employee
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  restoreEmployee = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const employee = await employeeService.restoreEmployee(id);
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee not found or not deleted', statusCode: 404 } });
    }
    res.json(successResponse(employee, 'Employee restored successfully'));
  });

  /**
   * Get employee performance
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getEmployeePerformance = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const performance = await employeeService.getEmployeePerformance(id);
    res.json(successResponse(performance, 'Performance retrieved successfully'));
  });

  /**
   * Change password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  changePassword = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const currentUser = req.user;
    
    await employeeService.changePassword(id, currentPassword, newPassword, currentUser);
    res.json(successResponse(null, 'Password changed successfully'));
  });
}

module.exports = new EmployeeController();
