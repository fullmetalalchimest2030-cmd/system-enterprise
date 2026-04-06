/**
 * Validation Middleware using Joi
 * @module shared/middleware/validation
 */

const Joi = require('joi');
const { AppError } = require('./errorHandler');

/**
 * Validate request data against Joi schema
 * @param {Object} schema - Joi schema object with body, query, params
 * @returns {Function} Express middleware
 */
/**
 * Converts string numbers to actual numbers in an object
 * @param {Object} obj - Object to process
 * @returns {Object} Object with string numbers converted
 */
const coerceStringNumbers = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  // Fields that should NOT be converted from string to number
  const excludeFields = ['phone', 'id', 'sku', 'postal_code', 'card_number', 'account_number'];
  
  const result = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    // Skip fields that should remain as strings
    if (excludeFields.includes(key)) {
      result[key] = obj[key];
    } else if (obj[key] !== null && typeof obj[key] === 'string' && /^\d+(\.\d+)?$/.test(obj[key])) {
      result[key] = Number(obj[key]);
    } else if (typeof obj[key] === 'object') {
      result[key] = coerceStringNumbers(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * Validate request data against Joi schema
 * @param {Object} schema - Joi schema object with body, query, params
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown keys that will be ignored
      stripUnknown: true, // Remove unknown keys from validated data
    };

    // Coerce string numbers to actual numbers in body, query, and params
    if (req.body && typeof req.body === 'object') {
      req.body = coerceStringNumbers(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = coerceStringNumbers(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = coerceStringNumbers(req.params);
    }

    // DEBUG: Log request details for debugging validation failures
    console.log('[VALIDATION DEBUG] Method:', req.method, '| Path:', req.originalUrl);
    console.log('[VALIDATION DEBUG] Body:', JSON.stringify(req.body));
    console.log('[VALIDATION DEBUG] Query:', JSON.stringify(req.query));
    console.log('[VALIDATION DEBUG] Params:', JSON.stringify(req.params));

    // Validate body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        console.log('[VALIDATION ERROR] Body validation failed:', JSON.stringify(errors));
        return next(new AppError('Validation failed', 400, errors));
      }
      req.body = value;
    }

    // Validate query params
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        console.log('[VALIDATION ERROR] Query validation failed:', JSON.stringify(errors));
        return next(new AppError('Query validation failed', 400, errors));
      }
      req.query = value;
    }

    // Validate URL params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        console.log('[VALIDATION ERROR] Params validation failed:', JSON.stringify(errors));
        return next(new AppError('Params validation failed', 400, errors));
      }
      req.params = value;
    }

    next();
  };
};

module.exports = { validate };
