/**
 * Audit Routes - API endpoints for audit log management
 * @module modules/audit/routes/auditRoutes
 */

const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');

/**
 * Audit routes:
 * - GET /audit - Get all audit logs
 * - GET /audit/:id - Get audit log by ID
 * - POST /audit - Create new audit log
 * - GET /audit/user/:userId - Get audit logs by user
 * - GET /audit/record/:tableName/:recordId - Get audit logs by record
 * - GET /audit/statistics - Get action statistics
 */

// GET /audit - Get all audit logs
router.get('/', authenticateToken, authorizeRoles('admin'), auditController.getAllLogs);

// GET /audit/statistics - Get action statistics
router.get('/statistics', authenticateToken, authorizeRoles('admin'), auditController.getActionStatistics);

// GET /audit/user/:userId - Get audit logs by user
router.get('/user/:userId', authenticateToken, authorizeRoles('admin'), auditController.getLogsByUser);

// GET /audit/record/:tableName/:recordId - Get audit logs by record
router.get('/record/:tableName/:recordId', authenticateToken, authorizeRoles('admin'), auditController.getLogsByRecord);

// GET /audit/:id - Get audit log by ID
router.get('/:id', authenticateToken, authorizeRoles('admin'), auditController.getLogById);

// POST /audit - Create new audit log (manual logging)
router.post('/', authenticateToken, authorizeRoles('admin'), auditController.createLog);

module.exports = router;
