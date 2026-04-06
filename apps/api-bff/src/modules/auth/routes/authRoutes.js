/**
 * Authentication routes
 * @module modules/auth/routes/authRoutes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { authSchemas } = require('../../../shared/validation/schemas');

/**
 * Authentication routes
 * - POST /auth/login - Login user
 * - POST /auth/logout - Logout user
 * - GET /auth/verify - Verify token
 * - POST /auth/refresh - Refresh token
 */

// POST /auth/login - Login user
router.post('/login', validate(authSchemas.login), authController.login);

// POST /auth/logout - Logout user
router.post('/logout', authenticateToken, authController.logout);

// GET /auth/verify - Verify token
router.get('/verify', authenticateToken, authController.verifyToken);

// POST /auth/refresh - Refresh token
router.post('/refresh', validate(authSchemas.refreshToken), authController.refreshToken);

module.exports = router;
