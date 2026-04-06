/**
 * Alert Routes - API endpoints for alert management
 * @module modules/alerts/routes/alertRoutes
 */

const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');

/**
 * Alert routes:
 * - GET /alerts - Get all alerts
 * - GET /alerts/:id - Get alert by ID
 * - POST /alerts - Create new alert
 * - PUT /alerts/:id/read - Mark alert as read
 * - PUT /alerts/:id/resolve - Resolve alert
 * - DELETE /alerts/:id - Delete alert
 * - GET /alerts/unread/count - Get unread count
 * - PUT /alerts/read-all - Mark all as read
 * - GET /alerts/critical - Get critical alerts
 * - POST /alerts/check/low-stock - Check low stock
 */

// GET /alerts - Get all alerts
router.get('/', authenticateToken, alertController.getAllAlerts);

// GET /alerts/unread/count - Get unread count
router.get('/unread/count', authenticateToken, alertController.getUnreadCount);

// GET /alerts/critical - Get critical alerts
router.get('/critical', authenticateToken, alertController.getCriticalAlerts);

// GET /alerts/:id - Get alert by ID
router.get('/:id', authenticateToken, alertController.getAlertById);

// POST /alerts - Create new alert
router.post('/', authenticateToken, authorizeRoles('admin'), alertController.createAlert);

// POST /alerts/check/low-stock - Check low stock and create alerts
router.post('/check/low-stock', authenticateToken, authorizeRoles('admin'), alertController.checkLowStock);

// PUT /alerts/:id/read - Mark alert as read
router.put('/:id/read', authenticateToken, alertController.markAsRead);

// PUT /alerts/:id/resolve - Resolve alert
router.put('/:id/resolve', authenticateToken, alertController.resolveAlert);

// PUT /alerts/read-all - Mark all alerts as read
router.put('/read-all', authenticateToken, alertController.markAllAsRead);

// DELETE /alerts/:id - Delete alert
router.delete('/:id', authenticateToken, authorizeRoles('admin'), alertController.deleteAlert);

module.exports = router;
