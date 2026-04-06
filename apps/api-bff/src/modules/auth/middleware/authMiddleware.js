/**
 * Authentication middleware
 * @module modules/auth/middleware/authMiddleware
 */

const jwt = require('jsonwebtoken');
const config = require('../../../config');
const { AppError } = require('../../../shared/middleware/errorHandler');
const tokenBlacklistService = require('../services/tokenBlacklistService');

/**
 * Authenticate token middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  // Check if token is blacklisted
  if (tokenBlacklistService.isBlacklisted(token)) {
    return next(new AppError('Token has been revoked', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    req.token = token; // Store token for potential blacklisting
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
};

/**
 * Authorize roles middleware
 * @param {Array} roles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Not authorized to access this route', 403));
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};
