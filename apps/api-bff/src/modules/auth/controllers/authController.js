/**
 * Authentication controller
 * @module modules/auth/controllers/authController
 */

const authService = require('../services/authService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

/**
 * Authentication controller class
 */
class AuthController {
  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email and password are required', statusCode: 400 }
      });
    }

    const result = await authService.login(email, password);
    res.status(200).json(successResponse(result, 'Login successful'));
  });

  /**
   * Logout user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  logout = asyncHandler(async (req, res, next) => {
    const token = req.token; // Token stored by authenticateToken middleware
    const result = await authService.logout(token);
    res.json(successResponse(result, 'Logout successful'));
  });

  /**
   * Verify token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  verifyToken = asyncHandler(async (req, res, next) => {
    const user = await authService.verifyToken(req.user);
    res.json(successResponse(user, 'Token is valid'));
  });

  /**
   * Refresh token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  refreshToken = asyncHandler(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token is required', statusCode: 400 }
      });
    }

    const result = await authService.refreshToken(refreshToken);
    res.json(successResponse(result, 'Token refreshed successfully'));
  });
}

module.exports = new AuthController();
