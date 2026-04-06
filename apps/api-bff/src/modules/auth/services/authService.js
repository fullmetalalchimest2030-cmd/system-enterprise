/**
 * Authentication service
 * @module modules/auth/services/authService
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../../../config');
const employeeModel = require('../../employees/models/employeeModel');
const { AppError } = require('../../../shared/middleware/errorHandler');
const tokenBlacklistService = require('./tokenBlacklistService');

/**
 * Authentication service class
 */
class AuthService {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data and tokens
   */
  async login(email, password) {
    // Find employee by email
    const employee = await employeeModel.findByEmail(email);
    
    if (!employee) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if employee is active
    if (!employee.is_active) {
      throw new AppError('Account is inactive', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password_hash);
    
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(employee);
    const refreshToken = this.generateRefreshToken(employee);

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = employee;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user
   * @param {string} token - JWT token to blacklist
   * @returns {Promise<Object>} Logout result
   */
  async logout(token) {
    try {
      // Decode token to get expiration time
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.exp) {
        throw new AppError('Invalid token', 400);
      }

      // Add token to blacklist with expiration time
      const expiresAt = decoded.exp * 1000; // Convert to milliseconds
      tokenBlacklistService.addToken(token, expiresAt);

      return { 
        message: 'Logout successful',
        blacklistedTokens: tokenBlacklistService.getSize()
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Logout failed', 500);
    }
  }

  /**
   * Verify token
   * @param {Object} user - Decoded user from token
   * @returns {Promise<Object>} User data
   */
  async verifyToken(user) {
    const employee = await employeeModel.findById(user.id);
    
    if (!employee) {
      throw new AppError('User not found', 404);
    }

    if (!employee.is_active) {
      throw new AppError('Account is inactive', 401);
    }

    const { password_hash, ...userWithoutPassword } = employee;
    return userWithoutPassword;
  }

  /**
   * Refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      const employee = await employeeModel.findById(decoded.id);
      
      if (!employee) {
        throw new AppError('User not found', 404);
      }

      if (!employee.is_active) {
        throw new AppError('Account is inactive', 401);
      }

      const newAccessToken = this.generateAccessToken(employee);
      const newRefreshToken = this.generateRefreshToken(employee);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401);
      }
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Generate access token
   * @param {Object} user - User object
   * @returns {string} JWT access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn || '24h' }
    );
  }

  /**
   * Generate refresh token
   * @param {Object} user - User object
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }
}

module.exports = new AuthService();
