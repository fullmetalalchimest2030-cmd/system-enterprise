/**
 * Shared utility functions
 * @module shared/utils
 */

/**
 * Async handler to catch errors in async routes
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Format date to ISO string
 * @param {Date} date - Date object
 * @returns {string} ISO formatted date
 */
function formatDate(date = new Date()) {
  return date.toISOString();
}

/**
 * Paginate results
 * @param {Array} data - Array of data
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated result
 */
function paginate(data, page = 1, limit = 10) {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const result = {
    data: data.slice(startIndex, endIndex),
    pagination: {
      total: data.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: startIndex > 0,
    },
  };
  
  return result;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize input string
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Build success response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response object
 */
function successResponse(data = null, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Build error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
function errorResponse(message = 'Error', statusCode = 500) {
  return {
    success: false,
    error: {
      message,
      statusCode,
    },
  };
}

module.exports = {
  asyncHandler,
  generateRandomString,
  formatDate,
  paginate,
  isValidEmail,
  sanitizeInput,
  successResponse,
  errorResponse,
};
