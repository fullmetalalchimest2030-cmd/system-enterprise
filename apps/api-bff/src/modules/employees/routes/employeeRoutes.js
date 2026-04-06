/**
 * Employee routes
 * @module modules/employees/routes/employeeRoutes
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { employeeSchemas } = require('../../../shared/validation/schemas');

/**
 * Employee routes
 * - GET /employees - Get all employees
 * - GET /employees/:id - Get employee by ID
 * - POST /employees - Create a new employee
 * - PUT /employees/:id - Update an employee
 * - DELETE /employees/:id - Delete an employee
 * - GET /employees/:id/performance - Get employee performance
 * - PUT /employees/:id/password - Change password
 */

// GET /employees - Get all employees (admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), employeeController.getAllEmployees);

// GET /employees/:id - Get employee by ID
router.get('/:id', authenticateToken, validate(employeeSchemas.getById), employeeController.getEmployeeById);

// POST /employees - Create a new employee (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), validate(employeeSchemas.create), employeeController.createEmployee);

// PUT /employees/:id - Update an employee
router.put('/:id', authenticateToken, validate(employeeSchemas.update), employeeController.updateEmployee);

// DELETE /employees/:id - Delete an employee (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), employeeController.deleteEmployee);

// POST /employees/:id/restore - Restore a deleted employee (admin only)
router.post('/:id/restore', authenticateToken, authorizeRoles('admin'), employeeController.restoreEmployee);

// GET /employees/:id/performance - Get employee performance
router.get('/:id/performance', authenticateToken, employeeController.getEmployeePerformance);

// PUT /employees/:id/password - Change password
router.put('/:id/password', authenticateToken, employeeController.changePassword);

module.exports = router;
